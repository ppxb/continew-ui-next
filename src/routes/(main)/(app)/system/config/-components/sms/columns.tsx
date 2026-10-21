import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Star, Trash2 } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
import { DefaultBadge, StatusCell } from '@/components/status-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { SmsConfigResp } from '@/lib/api/sms'
import type { DataTableFeatures } from '@/lib/data-table-features'

export type SmsAction = 'edit' | 'setDefault' | 'delete'

export function createSmsColumns(
  onAction: (action: SmsAction, record: SmsConfigResp) => void,
  rowOffset: number,
  supplierMap: Record<string, string>,
  canUpdate: boolean,
  canSetDefault: boolean,
  canDelete: boolean
): ColumnDef<DataTableFeatures, SmsConfigResp>[] {
  return [
    {
      id: 'index',
      header: '序号',
      size: 56,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-center text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
      )
    },
    {
      accessorKey: 'name',
      header: '配置名称',
      enableHiding: false,
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>
    },
    {
      accessorKey: 'supplier',
      header: '服务厂商',
      cell: ({ row }) => <Badge variant="outline">{supplierMap[row.original.supplier] || row.original.supplier}</Badge>
    },
    {
      accessorKey: 'accessKey',
      header: 'Access Key',
      cell: ({ row }) => <CopyableText value={row.original.accessKey} className="max-w-35 truncate text-xs" />
    },
    {
      accessorKey: 'signature',
      header: '短信签名',
      cell: ({ row }) => <span className="text-sm">{row.original.signature || '-'}</span>
    },
    {
      accessorKey: 'templateId',
      header: '模板 ID',
      cell: ({ row }) => <span className="text-xs">{row.original.templateId}</span>
    },
    {
      accessorKey: 'weight',
      header: () => <div className="text-center">权重</div>,
      cell: ({ row }) => <div className="text-center text-xs">{row.original.weight ?? 1}</div>
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
      accessorKey: 'isDefault',
      header: () => <div className="text-center">默认</div>,
      cell: ({ row }) => (
        <div className="flex justify-center">
          {row.original.isDefault ? (
            <DefaultBadge />
          ) : (
            <span className="text-xs text-muted-foreground">否</span>
          )}
        </div>
      )
    },
    {
      accessorKey: 'updateTime',
      header: '修改时间',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.updateTime || '-'}</span>
    },
    {
      accessorKey: 'createTime',
      header: '创建时间',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.createTime || '-'}</span>
    },
    {
      id: 'actions',
      header: () => <div className="text-right">操作</div>,
      enableHiding: false,
      cell: ({ row }) => {
        const record = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            {canUpdate && (
              <Button size="sm" variant="ghost" onClick={() => onAction('edit', record)}>
                修改
              </Button>
            )}
            {(canSetDefault || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button size="icon" variant="ghost" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    {canSetDefault && !record.isDefault && (
                      <DropdownMenuItem onClick={() => onAction('setDefault', record)}>
                        <Star className="size-4" />
                        设为默认
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem variant="destructive" onClick={() => onAction('delete', record)}>
                        <Trash2 className="size-4" />
                        删除
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      }
    }
  ]
}
