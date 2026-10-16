import type { ReactNode } from 'react'

import { CircleCheck, CircleSlash, MoreHorizontal, PenLine, Star, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { StorageResp } from '@/lib/api/storage'

import { MonoCell, RecycleBinCell, StorageNameCell, StorageStatusBadge } from './storage-display'

/** The row actions a storage row raises. */
export type StorageAction = 'edit' | 'setDefault' | 'toggleStatus' | 'delete'

/**
 * One column of a storage group table.
 *
 * The group panels render plain tables, the way the infrastructure screen does, so a column only
 * needs a header, a width for its `colgroup` entry, and a cell renderer.
 */
export interface StorageColumn {
  readonly id: string
  readonly header: string
  /** `colgroup` width; the tables use a fixed layout so long paths truncate instead of stretching. */
  readonly width: string
  readonly headerClassName?: string
  readonly cell: (storage: StorageResp) => ReactNode
}

export interface StorageColumnOptions {
  readonly onAction: (action: StorageAction, storage: StorageResp) => void
  readonly canUpdate: boolean
  readonly canDelete: boolean
  readonly canSetDefault: boolean
  readonly canUpdateStatus: boolean
}

/** Sum of the local column widths, so the fixed layout keeps them instead of squeezing. */
export const LOCAL_TABLE_MIN_WIDTH = 'min-w-[1376px]'

/** Sum of the object-storage column widths. */
export const OSS_TABLE_MIN_WIDTH = 'min-w-[1760px]'

const NAME_COLUMN: StorageColumn = {
  id: 'name',
  header: '名称',
  width: 'w-64',
  cell: storage => <StorageNameCell storage={storage} />
}

const STATUS_COLUMN: StorageColumn = {
  id: 'status',
  header: '状态',
  width: 'w-28',
  cell: storage => <StorageStatusBadge status={storage.status} />
}

const RECYCLE_BIN_COLUMN: StorageColumn = {
  id: 'recycleBin',
  header: '回收站',
  width: 'w-72',
  cell: storage => <RecycleBinCell enabled={storage.recycleBinEnabled} path={storage.recycleBinPath} />
}

function RowActions({ storage, options }: { storage: StorageResp; options: StorageColumnOptions }) {
  const { onAction, canUpdate, canDelete, canSetDefault, canUpdateStatus } = options
  // The backend refuses to disable or delete the default storage, and only an enabled one can
  // become the default.
  const isDefault = Boolean(storage.isDefault)
  const isEnabled = storage.status === 1
  const canToggleStatus = canUpdateStatus && !isDefault
  const canRemove = canDelete && !isDefault
  const canPromote = canSetDefault && !isDefault
  const hasRowGroup = canPromote || canUpdate

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} />}>
            <MoreHorizontal className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            更多操作
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          {hasRowGroup ? (
            <DropdownMenuGroup>
              {canPromote ? (
                <DropdownMenuItem disabled={!isEnabled} onClick={() => onAction('setDefault', storage)}>
                  <Star />
                  设为默认
                </DropdownMenuItem>
              ) : null}
              {canUpdate ? (
                <DropdownMenuItem onClick={() => onAction('edit', storage)}>
                  <PenLine />
                  修改
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          ) : null}

          {canToggleStatus ? (
            <>
              {hasRowGroup ? <DropdownMenuSeparator /> : null}
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => onAction('toggleStatus', storage)}>
                  {isEnabled ? <CircleSlash /> : <CircleCheck />}
                  {isEnabled ? '禁用' : '启用'}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}

          {canRemove ? (
            <>
              {hasRowGroup || canToggleStatus ? <DropdownMenuSeparator /> : null}
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onClick={() => onAction('delete', storage)}>
                  <Trash2 />
                  删除
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function actionsColumn(options: StorageColumnOptions): StorageColumn {
  return {
    id: 'actions',
    header: '操作',
    width: 'w-20',
    headerClassName: 'text-right',
    cell: storage => <RowActions storage={storage} options={options} />
  }
}

/** 本地存储: the two paths the Vue client's `StorageLocal.vue` shows, plus the recycle bin. */
export function createLocalStorageColumns(options: StorageColumnOptions): StorageColumn[] {
  return [
    NAME_COLUMN,
    STATUS_COLUMN,
    {
      id: 'bucketName',
      header: '存储路径',
      width: 'w-80',
      cell: storage => <MonoCell value={storage.bucketName} />
    },
    {
      id: 'domain',
      header: '访问路径',
      width: 'w-80',
      cell: storage => <MonoCell value={storage.domain} />
    },
    RECYCLE_BIN_COLUMN,
    actionsColumn(options)
  ]
}

/** 对象存储: the credentials and addresses the Vue client's `StorageOss.vue` shows. */
export function createOssStorageColumns(options: StorageColumnOptions): StorageColumn[] {
  return [
    NAME_COLUMN,
    STATUS_COLUMN,
    {
      id: 'accessKey',
      header: 'Access Key',
      width: 'w-56',
      cell: storage => <MonoCell value={storage.accessKey} />
    },
    {
      id: 'endpoint',
      header: 'Endpoint',
      width: 'w-72',
      cell: storage => <MonoCell value={storage.endpoint} />
    },
    {
      id: 'bucketName',
      header: 'Bucket',
      width: 'w-56',
      cell: storage => <MonoCell value={storage.bucketName} />
    },
    {
      id: 'domain',
      header: '自定义域名',
      width: 'w-72',
      cell: storage => <MonoCell value={storage.domain} />
    },
    RECYCLE_BIN_COLUMN,
    actionsColumn(options)
  ]
}
