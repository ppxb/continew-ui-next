import { type ColumnDef } from '@tanstack/react-table'
import { Eye, KeyRound, MoreHorizontal, Pen, Trash2 } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
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
import type { TenantResp } from '@/lib/api/tenant'
import type { DataTableFeatures } from '@/lib/data-table-features'

import { DomainCell, ExpireTimeCell, TextCell } from './tenant-display'

/** The row actions the table raises. */
export type TenantAction = 'detail' | 'edit' | 'adminPassword' | 'delete'

interface TenantColumnOptions {
  /** The index of the first row on the current page, so 序号 stays continuous. */
  readonly rowOffset: number
  readonly canGet: boolean
  readonly canUpdate: boolean
  readonly canUpdateAdminPassword: boolean
  readonly canDelete: boolean
  readonly onAction: (action: TenantAction, tenant: TenantResp) => void
}

function RowActions({
  tenant,
  canGet,
  canUpdate,
  canUpdateAdminPassword,
  canDelete,
  onAction
}: {
  tenant: TenantResp
  canGet: boolean
  canUpdate: boolean
  canUpdateAdminPassword: boolean
  canDelete: boolean
  onAction: (action: TenantAction, tenant: TenantResp) => void
}) {
  const hasPrimary = canGet || canUpdate
  const hasSecondary = canUpdateAdminPassword || canDelete

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
                <DropdownMenuItem onClick={() => onAction('detail', tenant)}>
                  <Eye />
                  详情
                </DropdownMenuItem>
              ) : null}
              {canUpdate ? (
                <DropdownMenuItem onClick={() => onAction('edit', tenant)}>
                  <Pen />
                  修改
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          ) : null}
          {hasPrimary && hasSecondary ? <DropdownMenuSeparator /> : null}
          {hasSecondary ? (
            <DropdownMenuGroup>
              {canUpdateAdminPassword ? (
                <DropdownMenuItem onClick={() => onAction('adminPassword', tenant)}>
                  <KeyRound />
                  修改管理员密码
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem
                  variant="destructive"
                  disabled={Boolean(tenant.disabled)}
                  onClick={() => onAction('delete', tenant)}
                >
                  <Trash2 />
                  删除
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/**
 * Builds the column set of the tenant table.
 *
 * The fields follow the Vue client's `tenant/management` page: the generated code, the
 * package it belongs to, its domain and expiry, and the administrator it was created with.
 */
export function createTenantColumns({
  rowOffset,
  canGet,
  canUpdate,
  canUpdateAdminPassword,
  canDelete,
  onAction
}: TenantColumnOptions) {
  const columns: ColumnDef<DataTableFeatures, TenantResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-center text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
      )
    },
    {
      accessorKey: 'code',
      header: '编码',
      cell: ({ row }) => <CopyableText value={row.original.code} />
    },
    {
      accessorKey: 'name',
      header: '名称',
      cell: ({ row }) => <TextCell value={row.original.name} />
    },
    {
      accessorKey: 'packageName',
      header: '套餐',
      cell: ({ row }) => <TextCell value={row.original.packageName} />
    },
    {
      accessorKey: 'domain',
      header: '域名',
      cell: ({ row }) => <DomainCell domain={row.original.domain} />
    },
    {
      accessorKey: 'expireTime',
      header: '过期时间',
      cell: ({ row }) => <ExpireTimeCell value={row.original.expireTime} />
    },
    {
      accessorKey: 'adminUsername',
      header: '管理员用户',
      cell: ({ row }) => <TextCell value={row.original.adminUsername} />
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

  if (canGet || canUpdate || canUpdateAdminPassword || canDelete) {
    columns.push({
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => (
        <RowActions
          tenant={row.original}
          canGet={canGet}
          canUpdate={canUpdate}
          canUpdateAdminPassword={canUpdateAdminPassword}
          canDelete={canDelete}
          onAction={onAction}
        />
      )
    })
  }

  return columns
}
