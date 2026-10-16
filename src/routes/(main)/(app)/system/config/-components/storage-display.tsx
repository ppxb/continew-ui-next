import { Badge } from '@/components/ui/badge'
import type { StorageResp, StorageStatus, StorageType } from '@/lib/api/storage'

/** Stands in for a value the backend leaves empty. */
export const EMPTY_PLACEHOLDER = '—'

const TYPE_LABELS: Record<StorageType, string> = {
  1: '本地存储',
  2: '对象存储'
}

export function storageTypeLabel(type: StorageType) {
  return TYPE_LABELS[type] ?? '未知存储'
}

/** What the backend registers for the type, shown under the drawer title. */
export function storageTypeDescription(type: StorageType) {
  return type === 1 ? '文件保存在服务器本地目录' : '文件保存在对象存储，走 S3 兼容协议'
}

export function StorageStatusBadge({ status }: { status?: StorageStatus | null }) {
  const isEnabled = status === 1

  return (
    <Badge variant="secondary" className="gap-1.5">
      <span className={isEnabled ? 'size-1.5 rounded-full bg-green-600' : 'size-1.5 rounded-full bg-destructive'} />
      {isEnabled ? '启用' : '禁用'}
    </Badge>
  )
}

export function DefaultStorageBadge() {
  return <Badge className="rounded-sm px-1.5 py-0.5">默认</Badge>
}

/** The name with its code underneath, plus the default marker the row menu keys off. */
export function StorageNameCell({ storage }: { storage: StorageResp }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-medium text-foreground" title={storage.name}>
          {storage.name}
        </span>
        {storage.isDefault ? <DefaultStorageBadge /> : null}
      </span>
      <span className="truncate text-muted-foreground" title={storage.code}>
        {storage.code}
      </span>
    </span>
  )
}

/** A path or address, monospaced and truncated so a long value cannot widen the column. */
export function MonoCell({ value }: { value?: string | null }) {
  if (!value) {
    return <span className="text-sm">{EMPTY_PLACEHOLDER}</span>
  }

  return (
    <span className="block truncate" title={value}>
      {value}
    </span>
  )
}

export function RecycleBinCell({ enabled, path }: { enabled?: boolean | null; path?: string | null }) {
  if (!enabled) {
    return <span className="text-sm text-muted-foreground">未启用</span>
  }

  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm">已启用</span>
      <MonoCell value={path} />
    </span>
  )
}

const BYTES_PER_MEGABYTE = 1024 * 1024

/** The backend stores the multipart settings in bytes; the drawer edits them in MB. */
export function bytesToMegabytes(bytes?: number | null) {
  if (typeof bytes !== 'number' || bytes <= 0) {
    return undefined
  }

  return Number((bytes / BYTES_PER_MEGABYTE).toFixed(2))
}

export function megabytesToBytes(megabytes?: number | null) {
  const value = Number(megabytes)

  if (!Number.isFinite(value) || value <= 0) {
    return null
  }

  return Math.round(value * BYTES_PER_MEGABYTE)
}
