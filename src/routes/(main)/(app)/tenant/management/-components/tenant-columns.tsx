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

type TextColumnKey =
  | 'name'
  | 'packageName'
  | 'adminUsername'
  | 'description'
  | 'createUserString'
  | 'createTime'
  | 'updateUserString'
  | 'updateTime'

function textColumn(key: TextColumnKey, header: string): ColumnDef<DataTableFeatures, TenantResp> {
  return {
    accessorKey: key,
    header,
    cell: ({ row }) => <TextCell value={row.original[key]} />
  }
}

type RowActionsProps = Omit<TenantColumnOptions, 'rowOffset'> & { readonly tenant: TenantResp }

function RowActions({ tenant, canGet, canUpdate, canUpdateAdminPassword, canDelete, onAction }: RowActionsProps) {
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

/** Builds the column set of the tenant table, in the order of the Vue client's page. */
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
      cell: ({ row }) => <div>{rowOffset + row.index + 1}</div>
    },
    {
      accessorKey: 'code',
      header: '编码',
      cell: ({ row }) => <CopyableText value={row.original.code} />
    },
    textColumn('name', '名称'),
    textColumn('packageName', '套餐'),
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
    textColumn('adminUsername', '管理员用户'),
    {
      accessorKey: 'status',
      header: () => <div>状态</div>,
      cell: ({ row }) => <StatusCell status={row.original.status} />
    },
    textColumn('description', '描述'),
    textColumn('createUserString', '创建人'),
    textColumn('createTime', '创建时间'),
    textColumn('updateUserString', '修改人'),
    textColumn('updateTime', '修改时间')
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
