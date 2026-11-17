import { z } from 'zod'

import { CircleCheck, CircleSlash, PenLine, Star, Trash2 } from 'lucide-react'

import type { ProColumns, ProFieldColumn, ProFormInstance } from '@/components/pro'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { StatusCell } from '@/components/status-cell'
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { usePermission } from '@/hooks/use-permission'
import type { StorageReq, StorageResp, StorageType } from '@/lib/api/storage'

import { bytesToMegabytes, megabytesToBytes, MonoCell, RecycleBinCell, StorageNameCell } from './display'

/** The row actions a storage row raises. */
export type StorageAction = 'edit' | 'setDefault' | 'toggleStatus' | 'delete'

export type StorageRecord = StorageResp & { secretKey?: string }

export interface StorageColumnOptions {
  readonly onAction: (action: StorageAction, storage: StorageResp) => void
}

export interface StorageSchemaOptions {
  readonly isEdit?: boolean
}

export const LOCAL_TABLE_MIN_WIDTH = 'min-w-[1200px] table-fixed [&_th:nth-child(1)]:w-64 [&_th:nth-child(2)]:w-28 [&_th:nth-child(3)]:w-80 [&_th:nth-child(4)]:w-80 [&_th:nth-child(5)]:w-28 [&_th:nth-child(6)]:w-20'
export const OSS_TABLE_MIN_WIDTH = 'min-w-[1584px] table-fixed [&_th:nth-child(1)]:w-64 [&_th:nth-child(2)]:w-28 [&_th:nth-child(3)]:w-56 [&_th:nth-child(4)]:w-72 [&_th:nth-child(5)]:w-56 [&_th:nth-child(6)]:w-72 [&_th:nth-child(7)]:w-28 [&_th:nth-child(8)]:w-20'

const CODE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{1,29}$/
const ENDPOINT_PATTERN = /^(https?):\/\/[\w-+&@#/%?=~_|!:,.;]*[\w-+&@#/%=~_|]$/

const storageRules = {
  name: z.string().trim().min(1, '请输入名称').max(100, '名称长度不能超过 100 个字符'),
  code: z.string().trim().regex(CODE_PATTERN, '编码长度为 2-30 个字符，支持大小写字母、数字、下划线，以字母开头'),
  accessKey: z.string().trim().min(1, '请输入 Access Key').max(255, 'Access Key 长度不能超过 255 个字符'),
  secretKey: z.string().max(255, 'Secret Key 长度不能超过 255 个字符').transform(value => value.trim()),
  endpoint: z.string().trim().min(1, '请输入 Endpoint').max(255, 'Endpoint 长度不能超过 255 个字符').regex(ENDPOINT_PATTERN, 'Endpoint 需以 http:// 或 https:// 开头'),
  bucketName: z.string().trim().max(255, 'Bucket/存储路径长度不能超过 255 个字符'),
  domain: z.string().trim().max(255, '域名/访问路径长度不能超过 255 个字符'),
  multipartUploadThreshold: z.number({ message: '请输入有效的分片阈值' }).nullable().refine(value => value === null || value > 0, '分片阈值必须大于 0'),
  multipartUploadPartSize: z.number({ message: '请输入有效的分片大小' }).nullable().refine(value => value === null || value > 0, '分片大小必须大于 0'),
  multipartTempDir: z.string().trim().max(255, '本地分片临时目录长度不能超过 255 个字符'),
  recycleBinEnabled: z.boolean(),
  recycleBinPath: z.string().trim().max(255, '回收站路径长度不能超过 255 个字符').min(1, '请输入回收站路径'),
  sort: z.number({ error: '请输入排序' }).int({ message: '排序必须为整数' }).min(1, '排序必须大于 0'),
  description: z.string().trim().max(200, '描述长度不能超过 200 个字符'),
  status: z.literal([1, 2])
}

function multipartThresholdRule(form: ProFormInstance) {
  return storageRules.multipartUploadThreshold.refine(threshold => {
    const partSize = form.getFieldValue('multipartUploadPartSize')
    return threshold === null || typeof partSize !== 'number' || threshold >= partSize
  }, '分片阈值不能小于分片大小')
}

/** One schema per engine, shared by the grouped table and drawer form. */
function storageColumns(type: StorageType, { isEdit = false }: StorageSchemaOptions = {}): readonly ProColumns<StorageRecord>[] {
  const isOss = type === 2
  const recycleBinPath: ProFieldColumn<StorageRecord> = {
    title: '回收站路径', dataIndex: 'recycleBinPath', hideInTable: true,
    initialValue: '.RECYCLE.BIN/', convertValue: value => value ?? '',
    fieldProps: { maxLength: 255, placeholder: '请输入回收站路径', disabled: isEdit },
    formItemProps: { rules: storageRules.recycleBinPath }
  }
  return [
    {
      title: '名称', dataIndex: 'name', order: 20,
      fieldProps: { maxLength: 100, placeholder: '例如：本地文件存储' },
      formItemProps: { rules: storageRules.name },
      render: (_, storage) => <StorageNameCell storage={storage} />
    },
    {
      title: '编码', dataIndex: 'code', hideInTable: true, order: 19,
      fieldProps: { maxLength: 30, placeholder: '请输入存储编码', disabled: isEdit },
      formItemProps: { rules: storageRules.code, description: isEdit ? '编码创建后不可修改' : undefined, hideDescriptionOnError: true }
    },
    {
      title: '状态', dataIndex: 'status', valueType: 'switch', initialValue: 1, order: 1,
      fieldProps: (_form, { entity }) => ({ disabled: Boolean(entity?.isDefault) }),
      formItemProps: (form, { entity }) => ({
        rules: storageRules.status, required: false,
        description: entity?.isDefault ? '默认存储不允许禁用' : form.getFieldValue('status') === 1 ? '启用后该存储可以接收上传的文件' : '禁用后该存储不再接收上传的文件'
      }),
      render: (_, storage) => <StatusCell status={storage.status} />
    },
    ...(isOss ? [
      {
        title: 'Access Key', dataIndex: 'accessKey', order: 18,
        fieldProps: { maxLength: 255, placeholder: '请输入 Access Key', autoComplete: 'off' },
        formItemProps: { rules: storageRules.accessKey },
        render: (_dom, storage) => <MonoCell value={storage.accessKey} />
      },
      {
        title: 'Secret Key', dataIndex: 'secretKey', valueType: 'password', hideInTable: true, order: 17,
        initialValue: '', convertValue: () => '',
        fieldProps: { maxLength: 255, placeholder: isEdit ? '保持 Secret Key 为空将不更改' : '请输入 Secret Key', autoComplete: 'new-password' },
        formItemProps: {
          rules: isEdit ? storageRules.secretKey : storageRules.secretKey.refine(value => value.length > 0, '请输入 Secret Key'),
          required: !isEdit, description: '提交前使用 RSA 公钥加密，服务端解密后保存', hideDescriptionOnError: true
        }
      },
      {
        title: 'Endpoint', dataIndex: 'endpoint', order: 16,
        fieldProps: { maxLength: 255, placeholder: '请输入 Endpoint' },
        formItemProps: { rules: storageRules.endpoint },
        render: (_dom, storage) => <MonoCell value={storage.endpoint} />
      }
    ] satisfies ProColumns<StorageRecord>[] : []),
    {
      title: isOss ? 'Bucket' : '存储路径', dataIndex: 'bucketName', order: 15,
      fieldProps: { maxLength: 255, placeholder: isOss ? '请输入 Bucket' : '请输入存储路径' },
      formItemProps: { rules: storageRules.bucketName.min(1, isOss ? '请输入 Bucket' : '请输入存储路径') },
      render: (_, storage) => <MonoCell value={storage.bucketName} />
    },
    {
      title: (_schema, mode) => isOss ? mode === 'table' ? '自定义域名' : '域名' : '访问路径', dataIndex: 'domain', order: 14,
      fieldProps: { maxLength: 255, placeholder: isOss ? '请输入域名' : '请输入访问路径' },
      formItemProps: { rules: isOss ? storageRules.domain : storageRules.domain.min(1, '请输入访问路径'), description: isOss ? '为空时由 Endpoint 与 Bucket 推导访问前缀' : undefined, hideDescriptionOnError: true },
      render: (_, storage) => <MonoCell value={storage.domain} />
    },
    {
      title: (_schema, mode) => mode === 'table' ? '回收站' : '启用回收站', key: 'recycleBin', dataIndex: 'recycleBinEnabled', valueType: 'switch', order: 13,
      initialValue: true, convertValue: value => value ?? true,
      fieldProps: { checkedValue: true, uncheckedValue: false, disabled: isEdit },
      formItemProps: { rules: storageRules.recycleBinEnabled, required: false, description: isEdit ? '回收站配置创建后不可修改' : '删除文件时移动至回收站目录，而不是直接移除' },
      render: (_, storage) => <RecycleBinCell enabled={storage.recycleBinEnabled} />
    },
    { valueType: 'dependency', name: ['recycleBinEnabled'], columns: values => values.recycleBinEnabled ? [{ ...recycleBinPath, order: 12 }] : [] },
    {
      title: '排序', dataIndex: 'sort', valueType: 'digit', hideInTable: true, initialValue: 1, order: 11,
      fieldProps: { min: 1, step: '1' },
      formItemProps: { rules: storageRules.sort, required: false }
    },
    {
      title: '描述', dataIndex: 'description', valueType: 'textarea', hideInTable: true, order: 10,
      fieldProps: { rows: 3, maxLength: 200, placeholder: '选填' },
      formItemProps: { rules: storageRules.description, className: 'sm:col-span-2' }
    },
    {
      title: '分片阈值', dataIndex: 'multipartUploadThreshold', valueType: 'digit', hideInTable: true, order: -1,
      initialValue: null, convertValue: value => bytesToMegabytes(typeof value === 'number' ? value : null) ?? null,
      fieldProps: { min: 0.01, step: '0.01', addonEnd: 'MB', placeholder: '为空则使用默认配置' },
      formItemProps: form => ({ rules: multipartThresholdRule(form), description: '上传文件超过该大小后走分片上传', hideDescriptionOnError: true })
    },
    {
      title: '分片大小', dataIndex: 'multipartUploadPartSize', valueType: 'digit', hideInTable: true, order: -2,
      initialValue: null, convertValue: value => bytesToMegabytes(typeof value === 'number' ? value : null) ?? null,
      fieldProps: { min: 0.01, step: '0.01', addonEnd: 'MB', placeholder: '为空则使用默认配置' },
      formItemProps: { rules: storageRules.multipartUploadPartSize.refine(value => value === null || value >= (isOss ? 5 : 1), `分片大小不能小于 ${isOss ? 5 : 1} MB`), description: '对象存储不能小于 5 MB，本地存储不能小于 1 MB', hideDescriptionOnError: true }
    },
    ...(!isOss ? [{
      title: '分片临时目录', dataIndex: 'multipartTempDir', hideInTable: true, order: -3,
      fieldProps: { maxLength: 255, placeholder: '为空则使用默认配置' },
      formItemProps: { rules: storageRules.multipartTempDir, description: '仅本地存储使用，合并分片时的临时目录', hideDescriptionOnError: true, className: 'sm:col-span-2' }
    }] satisfies ProColumns<StorageRecord>[] : [])
  ]
}

export function localStorageColumns(options?: StorageSchemaOptions) {
  return storageColumns(1, options)
}

export function ossStorageColumns(options?: StorageSchemaOptions) {
  return storageColumns(2, options)
}

/** Parse the active schema result before converting MB and nullable engine-specific fields. */
export function toStorageReq(values: unknown, type: StorageType): StorageReq {
  const isOss = type === 2
  const parsed = z.object({
    ...storageRules,
    accessKey: isOss ? storageRules.accessKey : storageRules.accessKey.optional(),
    secretKey: storageRules.secretKey.optional(),
    endpoint: isOss ? storageRules.endpoint : storageRules.endpoint.optional(),
    multipartTempDir: storageRules.multipartTempDir.optional(),
    recycleBinPath: storageRules.recycleBinPath.optional()
  }).parse(values)
  return {
    name: parsed.name, code: parsed.code, type,
    accessKey: isOss ? parsed.accessKey : null,
    endpoint: isOss ? parsed.endpoint : null,
    bucketName: parsed.bucketName, domain: parsed.domain || null,
    multipartUploadThreshold: megabytesToBytes(parsed.multipartUploadThreshold),
    multipartUploadPartSize: megabytesToBytes(parsed.multipartUploadPartSize),
    multipartTempDir: !isOss && parsed.multipartTempDir ? parsed.multipartTempDir : null,
    recycleBinEnabled: parsed.recycleBinEnabled,
    recycleBinPath: parsed.recycleBinEnabled ? parsed.recycleBinPath : null,
    sort: parsed.sort, description: parsed.description || undefined, status: parsed.status
  }
}

export function getStorageSecret(values: unknown) {
  return z.object({ secretKey: storageRules.secretKey.optional() }).parse(values).secretKey
}

function RowActions({
  storage,
  onAction
}: {
  storage: StorageResp
  onAction: (action: StorageAction, storage: StorageResp) => void
}) {
  const { hasPermission } = usePermission()
  // The backend refuses to disable or delete the default storage, and only an enabled one can
  // become the default.
  const isDefault = Boolean(storage.isDefault)
  const isEnabled = storage.status === 1
  const canPromote = hasPermission('system:storage:setDefault') && !isDefault
  const canEdit = hasPermission('system:storage:update')
  const canToggleStatus = hasPermission('system:storage:updateStatus') && !isDefault
  const canRemove = hasPermission('system:storage:delete') && !isDefault
  const hasRowGroup = canPromote || canEdit

  return (
    <div className="flex items-center justify-end">
      <RowActionsMenu>
        {hasRowGroup && (
          <DropdownMenuGroup>
            {canPromote && (
              <DropdownMenuItem disabled={!isEnabled} onClick={() => onAction('setDefault', storage)}>
                <Star />
                设为默认
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem onClick={() => onAction('edit', storage)}>
                <PenLine />
                修改
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        )}

        {canToggleStatus && (
          <>
            {hasRowGroup && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onAction('toggleStatus', storage)}>
                {isEnabled ? <CircleSlash /> : <CircleCheck />}
                {isEnabled ? '禁用' : '启用'}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}

        {canRemove && (
          <>
            {(hasRowGroup || canToggleStatus) && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={() => onAction('delete', storage)}>
                <Trash2 />
                删除
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </RowActionsMenu>
    </div>
  )
}

function actionsColumn(onAction: (action: StorageAction, storage: StorageResp) => void): ProColumns<StorageRecord> {
  return {
    key: 'actions', title: '操作', valueType: 'option', align: 'right',
    render: (_, storage) => <RowActions storage={storage} onAction={onAction} />
  }
}

export function createLocalStorageColumns(options: StorageColumnOptions): readonly ProColumns<StorageRecord>[] {
  return [...localStorageColumns(), actionsColumn(options.onAction)]
}

export function createOssStorageColumns(options: StorageColumnOptions): readonly ProColumns<StorageRecord>[] {
  return [...ossStorageColumns(), actionsColumn(options.onAction)]
}
