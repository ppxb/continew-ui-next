import * as React from 'react'

import { Plus, Trash2 } from 'lucide-react'

import { ProTable } from '@/components/pro'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { dictKeys, listDictItems, type DictItemResp, type DictResp } from '@/lib/api/dict'

import { createDictItemColumns, type DictItemAction } from './dict-columns'

const DEFAULT_SORT = 'sort,asc'

interface DictItemPanelProps {
  readonly dict: DictResp
  readonly canCreateItem: boolean
  readonly canUpdateItem: boolean
  readonly canDeleteItem: boolean
  readonly canDeleteDict: boolean
  readonly onCreateItem: (dict: DictResp) => void
  readonly onEditItem: (dict: DictResp, item: DictItemResp) => void
  readonly onDeleteItem: (item: DictItemResp) => void
  readonly onDeleteDict: (dict: DictResp) => void
}

/** The right pane of the dictionary screen: the selected dictionary and its paginated items. */
export function DictItemPanel({
  dict,
  canCreateItem,
  canUpdateItem,
  canDeleteItem,
  canDeleteDict,
  onCreateItem,
  onEditItem,
  onDeleteItem,
  onDeleteDict
}: DictItemPanelProps) {
  const handleAction = React.useCallback(
    (action: DictItemAction, item: DictItemResp) => {
      if (action === 'update') {
        onEditItem(dict, item)
        return
      }

      onDeleteItem(item)
    },
    [dict, onEditItem, onDeleteItem]
  )

  const columns = React.useMemo(
    () => createDictItemColumns({ canUpdate: canUpdateItem, canDelete: canDeleteItem, onAction: handleAction }),
    [canUpdateItem, canDeleteItem, handleAction]
  )

  const canDeleteThisDict = canDeleteDict && !dict.isSystem

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-2 px-4 py-2 md:h-14 md:flex-row md:items-center md:justify-between md:gap-3 md:py-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="truncate text-base font-medium">{dict.name}</h3>
          <span className="shrink-0 text-sm text-muted-foreground">({dict.code})</span>
          {dict.isSystem && (
            <Badge variant="outline" className="shrink-0 px-1 py-0 text-[10px] font-normal">
              内置
            </Badge>
          )}
          {dict.description ? (
            <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">{dict.description}</span>
          ) : null}
        </div>

      </div>

      <ProTable<DictItemResp, { dictId: string | number }>
        columns={columns}
        rowKey="id"
        cardProps={false}
        embedded
        search={false}
        options={false}
        queryKey={dictKeys.itemLists()}
        params={{ dictId: dict.id }}
        request={async ({ current, pageSize, dictId }, _sort, _filter, signal) => {
          const page = await listDictItems({ dictId, page: current, size: pageSize, sort: DEFAULT_SORT }, signal)
          return { data: page.list, total: page.total }
        }}
        locale={{ emptyText: '暂无字典项' }}
        toolBarRender={() => [
          canCreateItem && <Button key="create" onClick={() => onCreateItem(dict)}><Plus />新增字典项</Button>,
          canDeleteThisDict && <RowActionsMenu key="delete" triggerVariant="outline" triggerSize="icon">
            <DropdownMenuItem variant="destructive" onClick={() => onDeleteDict(dict)}><Trash2 />删除字典</DropdownMenuItem>
          </RowActionsMenu>
        ]}
      />
    </div>
  )
}
