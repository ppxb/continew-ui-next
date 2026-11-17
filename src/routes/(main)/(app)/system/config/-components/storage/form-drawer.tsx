import * as React from 'react'

import { revalidateLogic, useSelector } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { ChevronRight, Cloud, HardDrive } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { useAppForm } from '@/components/form'
import { FormSkeleton } from '@/components/form-skeleton'
import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { FieldGroup } from '@/components/ui/field'
import { toast } from '@/components/ui/toast'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
import {
  createStorage,
  getStorage,
  type StorageReq,
  type StorageResp,
  type StorageStatus,
  type StorageType,
  updateStorage
} from '@/lib/api/storage'
import { encryptByRsa } from '@/lib/crypto'
import { storageKeys } from '@/lib/query-keys'

import { bytesToMegabytes, megabytesToBytes, storageTypeLabel } from './display'

/** Mirrors `RegexConstants.GENERAL_CODE`, which the backend applies to 编码. */
const CODE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{1,29}$/

/** Mirrors `RegexConstants.URL_HTTP`, which the backend applies to an OSS Endpoint. */
const ENDPOINT_PATTERN = /^(https?):\/\/[\w-+&@#/%?=~_|!:,.;]*[\w-+&@#/%=~_|]$/

/** The smallest multipart size S3-compatible object storage accepts, in MB. */
const OSS_MIN_PART_SIZE_MB = 5

/** The local engine has no such floor, so anything above zero is usable. */
const LOCAL_MIN_PART_SIZE_MB = 1

/**
 * A create has to carry a secret, but an edit leaves the field empty to mean "keep the stored one".
 * The object schema cannot express that, so the rule only sits on the field for a create.
 */
const createSecretKeyRule = z.string().trim().min(1, '请输入 Secret Key')

const formSchema = z
  .object({
    type: z.number().int().min(1).max(2),
    name: z.string().trim().min(1, '请输入名称').max(100, '名称长度不能超过 100 个字符'),
    code: z.string().trim().regex(CODE_PATTERN, '编码长度为 2-30 个字符，支持大小写字母、数字、下划线，以字母开头'),
    accessKey: z.string().trim().max(255, 'Access Key 长度不能超过 255 个字符'),
    secretKey: z.string().max(255, 'Secret Key 长度不能超过 255 个字符'),
    endpoint: z.string().trim().max(255, 'Endpoint 长度不能超过 255 个字符'),
    bucketName: z.string().trim().max(255, 'Bucket/存储路径长度不能超过 255 个字符'),
    domain: z.string().trim().max(255, '域名/访问路径长度不能超过 255 个字符'),
    // A cleared input stores `null`, which means "use the default configuration".
    multipartUploadThreshold: z
      .number({ message: '请输入有效的分片阈值' })
      .nullable()
      .refine(value => value === null || value > 0, '分片阈值必须大于 0'),
    multipartUploadPartSize: z
      .number({ message: '请输入有效的分片大小' })
      .nullable()
      .refine(value => value === null || value > 0, '分片大小必须大于 0'),
    multipartTempDir: z.string().trim().max(255, '本地分片临时目录长度不能超过 255 个字符'),
    recycleBinEnabled: z.boolean(),
    recycleBinPath: z.string().trim().max(255, '回收站路径长度不能超过 255 个字符'),
    // A cleared input stores `null`, so the form can report it instead of snapping back to 1.
    sort: z
      .number({ error: '请输入排序' })
      .int({ message: '排序必须为整数' })
      .min(1, '排序必须大于 0')
      .nullable()
      .refine(value => value !== null, '请输入排序'),
    description: z.string().trim().max(200, '描述长度不能超过 200 个字符'),
    status: z.number().int().min(1).max(2)
  })
  .superRefine((values, ctx) => {
    // The backend validates each type against its own group: an OSS storage needs credentials and
    // an Endpoint, a local one needs the two paths. 域名 is optional for OSS, because the backend
    // derives a URL prefix from the Endpoint and Bucket when it is blank.
    const isOss = values.type === 2

    if (isOss) {
      if (!values.accessKey) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accessKey'], message: '请输入 Access Key' })
      }
      if (!values.endpoint) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endpoint'], message: '请输入 Endpoint' })
      } else if (!ENDPOINT_PATTERN.test(values.endpoint)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endpoint'],
          message: 'Endpoint 需以 http:// 或 https:// 开头'
        })
      }
      if (!values.bucketName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bucketName'], message: '请输入 Bucket' })
      }
    } else {
      if (!values.bucketName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['bucketName'], message: '请输入存储路径' })
      }
      if (!values.domain) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['domain'], message: '请输入访问路径' })
      }
    }

    if (values.recycleBinEnabled && !values.recycleBinPath) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recycleBinPath'], message: '请输入回收站路径' })
    }

    const partSize = values.multipartUploadPartSize
    if (partSize !== null) {
      const minPartSize = isOss ? OSS_MIN_PART_SIZE_MB : LOCAL_MIN_PART_SIZE_MB
      if (partSize < minPartSize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['multipartUploadPartSize'],
          message: `分片大小不能小于 ${minPartSize} MB`
        })
      }
    }

    const threshold = values.multipartUploadThreshold
    if (threshold !== null && partSize !== null && threshold < partSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['multipartUploadThreshold'],
        message: '分片阈值不能小于分片大小'
      })
    }
  })

// The input type: `sort` holds `null` while cleared, and the schema's output narrows it to a number.
type FormValues = z.input<typeof formSchema>

function createDefaults(type: StorageType): FormValues {
  return {
    type,
    name: '',
    code: '',
    accessKey: '',
    secretKey: '',
    endpoint: '',
    bucketName: '',
    domain: '',
    multipartUploadThreshold: null,
    multipartUploadPartSize: null,
    multipartTempDir: '',
    recycleBinEnabled: true,
    recycleBinPath: '.RECYCLE.BIN/',
    sort: 1,
    description: '',
    status: 1
  }
}

function toFormValues(storage: StorageResp): FormValues {
  return {
    type: storage.type,
    name: storage.name ?? '',
    code: storage.code ?? '',
    accessKey: storage.accessKey ?? '',
    // The backend never returns the Secret Key, so it stays empty and never reaches the body.
    secretKey: '',
    endpoint: storage.endpoint ?? '',
    bucketName: storage.bucketName ?? '',
    domain: storage.domain ?? '',
    multipartUploadThreshold: bytesToMegabytes(storage.multipartUploadThreshold) ?? null,
    multipartUploadPartSize: bytesToMegabytes(storage.multipartUploadPartSize) ?? null,
    multipartTempDir: storage.multipartTempDir ?? '',
    recycleBinEnabled: storage.recycleBinEnabled ?? true,
    recycleBinPath: storage.recycleBinPath ?? '',
    sort: storage.sort ?? 1,
    description: storage.description ?? '',
    status: storage.status ?? 1
  }
}

/** The body both modes send; a blank Secret Key is left out so an update keeps the stored one. */
function toStorageReq(values: FormValues): StorageReq {
  const isOss = values.type === 2

  return {
    name: values.name,
    code: values.code,
    type: values.type as StorageType,
    accessKey: isOss ? values.accessKey : null,
    endpoint: isOss ? values.endpoint : null,
    bucketName: values.bucketName,
    domain: values.domain || null,
    multipartUploadThreshold: megabytesToBytes(values.multipartUploadThreshold),
    multipartUploadPartSize: megabytesToBytes(values.multipartUploadPartSize),
    multipartTempDir: !isOss && values.multipartTempDir ? values.multipartTempDir : null,
    recycleBinEnabled: values.recycleBinEnabled,
    recycleBinPath: values.recycleBinEnabled ? values.recycleBinPath : null,
    // The schema rejects `null`, so a submitted form always carries a number.
    sort: values.sort as number,
    description: values.description || undefined,
    status: values.status as StorageStatus
  }
}

interface StorageFormDrawerProps {
  /**
   * The storage being edited, or `null` to create one.
   *
   * Unlike the delete dialog, `null` cannot mean "nothing picked yet": a create has to be able to
   * open the drawer, so `open` carries that state instead.
   */
  readonly storageId: string | number | null
  /** The type a create starts from, chosen by the toolbar. An edit reads it from the detail. */
  readonly storageType: StorageType
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Create and edit form for one storage, built like the user screen's form drawer.
 *
 * The field set and its order follow the Vue client's `AddModal.vue`, including its collapsed
 * 高级配置 section for the multipart settings, which the backend stores in bytes and the form
 * edits in MB.
 */
export function StorageFormDrawer({ storageId, storageType, open, onClose }: StorageFormDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = storageId !== null
  const [advancedOpen, setAdvancedOpen] = React.useState(false)

  const detail = useQuery({
    queryKey: storageKeys.detail(storageId),
    queryFn: ({ signal }) => getStorage(storageId!, signal),
    enabled: open && isEdit
  })

  const form = useAppForm({
    defaultValues: createDefaults(storageType),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      const payload = toStorageReq(value)
      const secretKey = value.secretKey.trim()

      if (value.type === 2 && secretKey) {
        try {
          payload.secretKey = encryptByRsa(secretKey)
        } catch {
          // Encryption happens locally, so the HTTP layer is not there to report it.
          toast.add({ title: 'Secret Key 加密失败，请刷新页面后重试', type: 'error' })
          return
        }
      }

      try {
        if (storageId === null) {
          await createStorage(payload)
        } else {
          await updateStorage(storageId, payload)
        }
      } catch {
        // The HTTP layer already reported the failure.
        return
      }

      onClose()
      void queryClient.invalidateQueries({ queryKey: storageKeys.all })
      toast.add({ title: isEdit ? '修改成功' : '新增成功', type: 'success' })
    }
  })

  // `form.state` is a render-time snapshot, so the value that reveals the recycle-bin path and the
  // "saving" flag that disables every control come from subscriptions.
  const recycleBinEnabled = useSelector(form.store, state => state.values.recycleBinEnabled)
  const isSubmitting = useSelector(form.store, state => state.isSubmitting)

  const activeType = (isEdit ? detail.data?.type : undefined) ?? storageType
  const isOss = activeType === 2
  const isDefaultStorage = Boolean(isEdit && detail.data?.isDefault)

  useFillFormOnce({
    open,
    isEdit,
    entityKey: storageId,
    createKey: storageType,
    record: detail.data,
    version: detail.dataUpdatedAt,
    buildValues: ({ isEdit: editing, record }) =>
      editing && record ? toFormValues(record) : createDefaults(storageType),
    apply: values => form.reset(values, { keepDefaultValues: true }),
    onFilled: ({ isEdit: editing, record }) => {
      // A storage that already uses the multipart settings should show them without a click.
      setAdvancedOpen(
        Boolean(
          editing &&
          record &&
          (record.multipartUploadThreshold || record.multipartUploadPartSize || record.multipartTempDir)
        )
      )
    }
  })

  const typeLabel = storageTypeLabel(activeType)

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={`${isEdit ? '修改' : '新增'}${typeLabel}`}
      icon={isOss ? <Cloud className="size-4" /> : <HardDrive className="size-4" />}
      width={36}
      closeDisabled={isSubmitting}
      canClose={() => !isSubmitting}
    >
      {!isEdit || detail.data ? (
        <form.AppForm>
          <form.FormShell footer={<form.FormFooter onCancel={onClose} />}>
            <FieldGroup className="gap-4">
              <form.AppField name="name" validators={{ onDynamic: formSchema.shape.name }}>
                {field => (
                  <field.TextInput
                    label="名称"
                    required
                    maxLength={100}
                    placeholder="例如：本地文件存储"
                    disabled={isSubmitting}
                  />
                )}
              </form.AppField>

              <form.AppField name="code" validators={{ onDynamic: formSchema.shape.code }}>
                {field => (
                  <field.TextInput
                    label="编码"
                    required
                    // The hint gives way to the error, so the two never stack.
                    description={isEdit && field.state.meta.errors.length === 0 ? '编码创建后不可修改' : undefined}
                    maxLength={30}
                    placeholder="请输入存储编码"
                    disabled={isEdit || isSubmitting}
                  />
                )}
              </form.AppField>

              {isOss ? (
                <>
                  <form.AppField name="accessKey" validators={{ onDynamic: formSchema.shape.accessKey }}>
                    {field => (
                      <field.TextInput
                        label="Access Key"
                        required
                        maxLength={255}
                        placeholder="请输入 Access Key"
                        autoComplete="off"
                        disabled={isSubmitting}
                      />
                    )}
                  </form.AppField>

                  <form.AppField
                    name="secretKey"
                    validators={!isEdit && isOss ? { onDynamic: createSecretKeyRule } : undefined}
                  >
                    {field => (
                      <field.PasswordInput
                        label="Secret Key"
                        required={!isEdit}
                        description="提交前使用 RSA 公钥加密，服务端解密后保存"
                        hideDescriptionOnError
                        maxLength={255}
                        placeholder={isEdit ? '保持 Secret Key 为空将不更改' : '请输入 Secret Key'}
                        autoComplete="new-password"
                        disabled={isSubmitting}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="endpoint" validators={{ onDynamic: formSchema.shape.endpoint }}>
                    {field => (
                      <field.TextInput
                        label="Endpoint"
                        required
                        maxLength={255}
                        placeholder="请输入 Endpoint"
                        disabled={isSubmitting}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="bucketName" validators={{ onDynamic: formSchema.shape.bucketName }}>
                    {field => (
                      <field.TextInput
                        label="Bucket"
                        required
                        maxLength={255}
                        placeholder="请输入 Bucket"
                        disabled={isSubmitting}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="domain" validators={{ onDynamic: formSchema.shape.domain }}>
                    {field => (
                      <field.TextInput
                        label="域名"
                        description={
                          field.state.meta.errors.length === 0 ? '为空时由 Endpoint 与 Bucket 推导访问前缀' : undefined
                        }
                        maxLength={255}
                        placeholder="请输入域名"
                        disabled={isSubmitting}
                      />
                    )}
                  </form.AppField>
                </>
              ) : (
                <>
                  <form.AppField name="bucketName" validators={{ onDynamic: formSchema.shape.bucketName }}>
                    {field => (
                      <field.TextInput
                        label="存储路径"
                        required
                        maxLength={255}
                        placeholder="请输入存储路径"
                        disabled={isSubmitting}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="domain" validators={{ onDynamic: formSchema.shape.domain }}>
                    {field => (
                      <field.TextInput
                        label="访问路径"
                        required
                        maxLength={255}
                        placeholder="请输入访问路径"
                        disabled={isSubmitting}
                      />
                    )}
                  </form.AppField>
                </>
              )}

              <form.AppField name="recycleBinEnabled">
                {field => (
                  <field.SwitchInput
                    label="启用回收站"
                    description={isEdit ? '回收站配置创建后不可修改' : '删除文件时移动至回收站目录，而不是直接移除'}
                    checkedValue={true}
                    uncheckedValue={false}
                    disabled={isEdit || isSubmitting}
                  />
                )}
              </form.AppField>

              {recycleBinEnabled ? (
                <form.AppField name="recycleBinPath" validators={{ onDynamic: formSchema.shape.recycleBinPath }}>
                  {field => (
                    <field.TextInput
                      label="回收站路径"
                      required
                      maxLength={255}
                      placeholder="请输入回收站路径"
                      disabled={isEdit || isSubmitting}
                    />
                  )}
                </form.AppField>
              ) : null}

              <form.AppField name="sort" validators={{ onDynamic: formSchema.shape.sort }}>
                {field => <field.NumberInput label="排序" min={1} step="1" disabled={isSubmitting} />}
              </form.AppField>

              <form.AppField name="description" validators={{ onDynamic: formSchema.shape.description }}>
                {field => (
                  <field.TextareaInput
                    label="描述"
                    rows={3}
                    maxLength={200}
                    placeholder="选填"
                    disabled={isSubmitting}
                  />
                )}
              </form.AppField>

              <form.AppField name="status">
                {field => (
                  <field.SwitchInput
                    label="状态"
                    description={
                      isDefaultStorage
                        ? '默认存储不允许禁用'
                        : field.state.value === 1
                          ? '启用后该存储可以接收上传的文件'
                          : '禁用后该存储不再接收上传的文件'
                    }
                    disabled={isDefaultStorage || isSubmitting}
                  />
                )}
              </form.AppField>

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger render={<Button variant="ghost" className="group justify-start gap-1" />}>
                  <ChevronRight className="transition-transform group-data-panel-open:rotate-90" />
                  高级配置
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <FieldGroup className="gap-4 pt-2">
                    <form.AppField
                      name="multipartUploadThreshold"
                      validators={{ onDynamic: formSchema.shape.multipartUploadThreshold }}
                    >
                      {field => (
                        <field.NumberInput
                          label="分片阈值"
                          description={
                            field.state.meta.errors.length === 0 ? '上传文件超过该大小后走分片上传' : undefined
                          }
                          addonEnd="MB"
                          min={0.01}
                          step="0.01"
                          placeholder="为空则使用默认配置"
                          disabled={isSubmitting}
                        />
                      )}
                    </form.AppField>

                    <form.AppField
                      name="multipartUploadPartSize"
                      validators={{ onDynamic: formSchema.shape.multipartUploadPartSize }}
                    >
                      {field => (
                        <field.NumberInput
                          label="分片大小"
                          description={
                            field.state.meta.errors.length === 0
                              ? `对象存储不能小于 ${OSS_MIN_PART_SIZE_MB} MB，本地存储不能小于 ${LOCAL_MIN_PART_SIZE_MB} MB`
                              : undefined
                          }
                          addonEnd="MB"
                          min={0.01}
                          step="0.01"
                          placeholder="为空则使用默认配置"
                          disabled={isSubmitting}
                        />
                      )}
                    </form.AppField>

                    {!isOss ? (
                      <form.AppField
                        name="multipartTempDir"
                        validators={{ onDynamic: formSchema.shape.multipartTempDir }}
                      >
                        {field => (
                          <field.TextInput
                            label="分片临时目录"
                            description={
                              field.state.meta.errors.length === 0 ? '仅本地存储使用，合并分片时的临时目录' : undefined
                            }
                            maxLength={255}
                            placeholder="为空则使用默认配置"
                            disabled={isSubmitting}
                          />
                        )}
                      </form.AppField>
                    ) : null}
                  </FieldGroup>
                </CollapsibleContent>
              </Collapsible>
            </FieldGroup>
          </form.FormShell>
        </form.AppForm>
      ) : detail.isError ? (
        <QueryState state="error" className="p-6" onRetry={() => void detail.refetch()} />
      ) : (
        <FormSkeleton
          fields={
            isOss
              ? [
                  'input',
                  'input',
                  'input',
                  'input',
                  'input',
                  'input',
                  'input',
                  'switch',
                  'input',
                  'input',
                  'textarea',
                  'switch'
                ]
              : ['input', 'input', 'input', 'input', 'switch', 'input', 'input', 'textarea', 'switch']
          }
          onCancel={onClose}
        />
      )}
    </EntityDrawer>
  )
}
