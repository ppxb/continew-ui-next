import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Cloud, HardDrive, X } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
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

const MB_SUFFIX_CLASS = 'pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground'

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
    multipartUploadThreshold: z
      .number({ message: '请输入有效的分片阈值' })
      .optional()
      .refine(value => value === undefined || value > 0, '分片阈值必须大于 0'),
    multipartUploadPartSize: z
      .number({ message: '请输入有效的分片大小' })
      .optional()
      .refine(value => value === undefined || value > 0, '分片大小必须大于 0'),
    multipartTempDir: z.string().trim().max(255, '本地分片临时目录长度不能超过 255 个字符'),
    recycleBinEnabled: z.boolean(),
    recycleBinPath: z.string().trim().max(255, '回收站路径长度不能超过 255 个字符'),
    sort: z.number().int({ message: '排序必须为整数' }).min(1, '排序必须大于 0'),
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
    if (partSize !== undefined) {
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
    if (threshold !== undefined && partSize !== undefined && threshold < partSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['multipartUploadThreshold'],
        message: '分片阈值不能小于分片大小'
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

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
    multipartUploadThreshold: undefined,
    multipartUploadPartSize: undefined,
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
    multipartUploadThreshold: bytesToMegabytes(storage.multipartUploadThreshold),
    multipartUploadPartSize: bytesToMegabytes(storage.multipartUploadPartSize),
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
    sort: values.sort,
    description: values.description || undefined,
    status: values.status as StorageStatus
  }
}

function StorageFormSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>

      <DrawerFooter className="flex-row justify-end gap-2 border-t p-4">
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button disabled>保存</Button>
      </DrawerFooter>
    </div>
  )
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
    queryFn: () => getStorage(storageId!),
    enabled: open && isEdit
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaults(storageType)
  })

  const activeType = (isEdit ? detail.data?.type : undefined) ?? storageType
  const isOss = activeType === 2
  const isDefaultStorage = Boolean(isEdit && detail.data?.isDefault)

  const recycleBinEnabled = useWatch({ control: form.control, name: 'recycleBinEnabled', defaultValue: true })

  React.useEffect(() => {
    if (!open) {
      form.reset(createDefaults(storageType))
      setAdvancedOpen(false)
      return
    }

    if (!isEdit) {
      form.reset(createDefaults(storageType))
      setAdvancedOpen(false)
      return
    }

    if (detail.data) {
      form.reset(toFormValues(detail.data))
      // A storage that already uses the multipart settings should show them without a click.
      setAdvancedOpen(
        Boolean(
          detail.data.multipartUploadThreshold || detail.data.multipartUploadPartSize || detail.data.multipartTempDir
        )
      )
    }
  }, [open, isEdit, storageType, detail.data, form])

  const onSubmit = async (values: FormValues) => {
    // The backend only requires it for a create, and it never returns the stored value.
    if (!isEdit && values.type === 2 && !values.secretKey.trim()) {
      form.setError('secretKey', { message: '请输入 Secret Key' })
      return
    }

    const payload = toStorageReq(values)
    const secretKey = values.secretKey.trim()

    if (values.type === 2 && secretKey) {
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

      onClose()
      void queryClient.invalidateQueries({ queryKey: storageKeys.all })
      toast.add({ title: isEdit ? '修改成功' : '新增成功', type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    }
  }

  const typeLabel = storageTypeLabel(activeType)

  return (
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        // Closing mid-save would leave the request in flight with no way to report it.
        if (!nextOpen && !form.formState.isSubmitting) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:36rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            {isOss ? <Cloud className="size-4" /> : <HardDrive className="size-4" />}
            <DrawerTitle>{`${isEdit ? '修改' : '新增'}${typeLabel}`}</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" disabled={form.formState.isSubmitting} />}>
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </DrawerClose>
        </DrawerHeader>

        {!isEdit || detail.data ? (
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <FieldGroup className="gap-4">
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        名称<span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        maxLength={100}
                        placeholder="例如：本地文件存储"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="code"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>
                        编码<span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        maxLength={30}
                        placeholder="请输入存储编码"
                        disabled={isEdit}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : isEdit ? (
                        <FieldDescription>编码创建后不可修改</FieldDescription>
                      ) : null}
                    </Field>
                  )}
                />

                {isOss ? (
                  <>
                    <Controller
                      control={form.control}
                      name="accessKey"
                      render={({ field, fieldState }) => (
                        <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                          <FieldLabel>
                            Access Key<span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input {...field} maxLength={255} placeholder="请输入 Access Key" autoComplete="off" />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="secretKey"
                      render={({ field, fieldState }) => (
                        <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                          <FieldLabel>Secret Key{!isEdit && <span className="text-destructive">*</span>}</FieldLabel>
                          <PasswordInput
                            {...field}
                            maxLength={255}
                            placeholder={isEdit ? '保持 Secret Key 为空将不更改' : '请输入 Secret Key'}
                            autoComplete="new-password"
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid ? (
                            <FieldError errors={[fieldState.error]} />
                          ) : (
                            <FieldDescription>提交前使用 RSA 公钥加密，服务端解密后保存</FieldDescription>
                          )}
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="endpoint"
                      render={({ field, fieldState }) => (
                        <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                          <FieldLabel>
                            Endpoint<span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input {...field} maxLength={255} placeholder="请输入 Endpoint" />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="bucketName"
                      render={({ field, fieldState }) => (
                        <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                          <FieldLabel>
                            Bucket<span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input {...field} maxLength={255} placeholder="请输入 Bucket" />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="domain"
                      render={({ field, fieldState }) => (
                        <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                          <FieldLabel>域名</FieldLabel>
                          <Input {...field} maxLength={255} placeholder="请输入域名" />
                          {fieldState.invalid ? (
                            <FieldError errors={[fieldState.error]} />
                          ) : (
                            <FieldDescription>为空时由 Endpoint 与 Bucket 推导访问前缀</FieldDescription>
                          )}
                        </Field>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <Controller
                      control={form.control}
                      name="bucketName"
                      render={({ field, fieldState }) => (
                        <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                          <FieldLabel>
                            存储路径<span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input {...field} maxLength={255} placeholder="请输入存储路径" />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      control={form.control}
                      name="domain"
                      render={({ field, fieldState }) => (
                        <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                          <FieldLabel>
                            访问路径<span className="text-destructive">*</span>
                          </FieldLabel>
                          <Input {...field} maxLength={255} placeholder="请输入访问路径" />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  </>
                )}

                <Controller
                  control={form.control}
                  name="recycleBinEnabled"
                  render={({ field, fieldState }) => (
                    <Field
                      orientation="horizontal"
                      className="items-center justify-between py-1"
                      data-invalid={fieldState.invalid}
                    >
                      <FieldContent>
                        <FieldLabel>启用回收站</FieldLabel>
                        <FieldDescription>
                          {isEdit ? '回收站配置创建后不可修改' : '删除文件时移动至回收站目录，而不是直接移除'}
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isEdit}
                        aria-invalid={fieldState.invalid}
                      />
                    </Field>
                  )}
                />

                {recycleBinEnabled ? (
                  <Controller
                    control={form.control}
                    name="recycleBinPath"
                    render={({ field, fieldState }) => (
                      <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                        <FieldLabel>
                          回收站路径<span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input {...field} maxLength={255} placeholder="请输入回收站路径" disabled={isEdit} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                ) : null}

                <Controller
                  control={form.control}
                  name="sort"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>排序</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        step="1"
                        value={field.value ?? 1}
                        onChange={event =>
                          field.onChange(Number.isNaN(event.target.valueAsNumber) ? 1 : event.target.valueAsNumber)
                        }
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                      <FieldLabel>描述</FieldLabel>
                      <Textarea
                        {...field}
                        rows={3}
                        maxLength={200}
                        placeholder="选填"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="status"
                  render={({ field, fieldState }) => (
                    <Field
                      orientation="horizontal"
                      className="items-center justify-between py-1"
                      data-invalid={fieldState.invalid}
                    >
                      <FieldContent>
                        <FieldLabel>状态</FieldLabel>
                        <FieldDescription>
                          {isDefaultStorage
                            ? '默认存储不允许禁用'
                            : field.value === 1
                              ? '启用后该存储可以接收上传的文件'
                              : '禁用后该存储不再接收上传的文件'}
                        </FieldDescription>
                      </FieldContent>
                      <Switch
                        checked={field.value === 1}
                        onCheckedChange={checked => field.onChange(checked ? 1 : 2)}
                        disabled={isDefaultStorage}
                        aria-invalid={fieldState.invalid}
                      />
                    </Field>
                  )}
                />

                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger render={<Button variant="ghost" className="group justify-start gap-1" />}>
                    <ChevronRight className="transition-transform group-data-panel-open:rotate-90" />
                    高级配置
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <FieldGroup className="gap-4 pt-2">
                      <Controller
                        control={form.control}
                        name="multipartUploadThreshold"
                        render={({ field, fieldState }) => (
                          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                            <FieldLabel>分片阈值</FieldLabel>
                            <div className="relative">
                              <Input
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={field.value ?? ''}
                                onChange={event =>
                                  field.onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)
                                }
                                placeholder="为空则使用默认配置"
                                className="pr-12"
                                aria-invalid={fieldState.invalid}
                              />
                              <span className={MB_SUFFIX_CLASS}>MB</span>
                            </div>
                            {fieldState.invalid ? (
                              <FieldError errors={[fieldState.error]} />
                            ) : (
                              <FieldDescription>上传文件超过该大小后走分片上传</FieldDescription>
                            )}
                          </Field>
                        )}
                      />

                      <Controller
                        control={form.control}
                        name="multipartUploadPartSize"
                        render={({ field, fieldState }) => (
                          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                            <FieldLabel>分片大小</FieldLabel>
                            <div className="relative">
                              <Input
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={field.value ?? ''}
                                onChange={event =>
                                  field.onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)
                                }
                                placeholder="为空则使用默认配置"
                                className="pr-12"
                                aria-invalid={fieldState.invalid}
                              />
                              <span className={MB_SUFFIX_CLASS}>MB</span>
                            </div>
                            {fieldState.invalid ? (
                              <FieldError errors={[fieldState.error]} />
                            ) : (
                              <FieldDescription>
                                对象存储不能小于 {OSS_MIN_PART_SIZE_MB} MB，本地存储不能小于 {LOCAL_MIN_PART_SIZE_MB} MB
                              </FieldDescription>
                            )}
                          </Field>
                        )}
                      />

                      {!isOss ? (
                        <Controller
                          control={form.control}
                          name="multipartTempDir"
                          render={({ field, fieldState }) => (
                            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                              <FieldLabel>分片临时目录</FieldLabel>
                              <Input {...field} maxLength={255} placeholder="为空则使用默认配置" />
                              {fieldState.invalid ? (
                                <FieldError errors={[fieldState.error]} />
                              ) : (
                                <FieldDescription>仅本地存储使用，合并分片时的临时目录</FieldDescription>
                              )}
                            </Field>
                          )}
                        />
                      ) : null}
                    </FieldGroup>
                  </CollapsibleContent>
                </Collapsible>
              </FieldGroup>
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 border-t p-4">
              <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Spinner />
                    保存中
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </DrawerFooter>
          </form>
        ) : detail.isError ? (
          <p className="p-4 text-sm text-foreground">加载失败，请稍后重试</p>
        ) : (
          <StorageFormSkeleton onClose={onClose} />
        )}
      </DrawerContent>
    </Drawer>
  )
}
