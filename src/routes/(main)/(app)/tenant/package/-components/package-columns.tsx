import type { ColumnDef } from '@tanstack/react-table'
import { Eye, MoreHorizontal, Pen, Trash2 } from 'lucide-react'

import { StatusCell } from '@/components/status-cell'
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
import type { PackageResp } from '@/lib/api/package'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import type { DataTableFeatures } from '@/lib/data-table-features'

/** The row actions the table raises. */
export type PackageAction = 'detail' | 'edit' | 'delete'

interface PackageColumnOptions {
  /** The index of the first row on the current page, so 序号 stays continuous. */
  readonly rowOffset: number
  readonly canGet: boolean
  readonly canUpdate: boolean
  readonly canDelete: boolean
  readonly onAction: (action: PackageAction, pkg: PackageResp) => void
}

function TextCell({ value }: { value: string | number | null | undefined }) {
  return <span className="text-sm">{value || value === 0 ? value : EMPTY_PLACEHOLDER}</span>
}

function RowActions({
  pkg,
  canGet,
  canUpdate,
  canDelete,
  onAction
}: {
  pkg: PackageResp
  canGet: boolean
  canUpdate: boolean
  canDelete: boolean
  onAction: (action: PackageAction, pkg: PackageResp) => void
}) {
  const hasPrimary = canGet || canUpdate

  return (
    <div className="flex items-center justify-center">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />} />}>
            <MoreHorizontal />
          </TooltipTrigger>
          <TooltipContent side="top">更多操作</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          {hasPrimary ? (
            <DropdownMenuGroup>
              {canGet ? (
                <DropdownMenuItem onClick={() => onAction('detail', pkg)}>
                  <Eye />
                  详情
                </DropdownMenuItem>
              ) : null}
              {canUpdate ? (
                <DropdownMenuItem onClick={() => onAction('edit', pkg)}>
                  <Pen />
                  修改
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          ) : null}
          {hasPrimary && canDelete ? <DropdownMenuSeparator /> : null}
          {canDelete ? (
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                disabled={Boolean(pkg.disabled)}
                onClick={() => onAction('delete', pkg)}
              >
                <Trash2 />
                删除
              </DropdownMenuItem>
            </DropdownMenuGroup>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Builds the column set of the package table, in the order of the Vue client's page. */
export function createPackageColumns({ rowOffset, canGet, canUpdate, canDelete, onAction }: PackageColumnOptions) {
  const columns: ColumnDef<DataTableFeatures, PackageResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-center text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
      )
    },
    {
      accessorKey: 'name',
      header: '名称',
      cell: ({ row }) => <TextCell value={row.original.name} />
    },
    {
      accessorKey: 'status',
      header: () => <div className="text-center">状态</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <StatusCell status={row.original.status} />
        </div>
      )
    },
    {
      accessorKey: 'sort',
      header: () => <div className="text-center">排序</div>,
      cell: ({ row }) => <div className="text-center text-sm tabular-nums">{row.original.sort}</div>
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }) => <TextCell value={row.original.description} />
    },
    {
      accessorKey: 'createUserString',
      header: '创建人',
      cell: ({ row }) => <TextCell value={row.original.createUserString} />
    },
    {
      accessorKey: 'createTime',
      header: '创建时间',
      cell: ({ row }) => <TextCell value={row.original.createTime} />
    },
    {
      accessorKey: 'updateUserString',
      header: '修改人',
      cell: ({ row }) => <TextCell value={row.original.updateUserString} />
    },
    {
      accessorKey: 'updateTime',
      header: '修改时间',
      cell: ({ row }) => <TextCell value={row.original.updateTime} />
    }
  ]

  if (canGet || canUpdate || canDelete) {
    columns.push({
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => (
        <RowActions
          pkg={row.original}
          canGet={canGet}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onAction={onAction}
        />
      )
    })
  }

  return columns
}
