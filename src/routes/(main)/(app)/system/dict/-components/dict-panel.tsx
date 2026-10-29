import * as React from 'react'

import { useQuery } from '@tanstack/react-query'

import { ChevronDown, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'

import { PaginationArrow } from '@/components/pagination-arrow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { dictKeys, listDictItems, type DictItemResp, type DictResp } from '@/lib/api/dict'

import { createDictItemColumns, type DictItemAction } from './dict-columns'
import { DictTable } from './dict-table'

const PAGE_SIZE = 10

interface DictGroupProps {
  readonly dict: DictResp
  readonly canCreateItem: boolean
  readonly canUpdateItem: boolean
  readonly canDeleteItem: boolean
  readonly canUpdateDict: boolean
  readonly canDeleteDict: boolean
  readonly onCreateItem: (dict: DictResp) => void
  readonly onEditItem: (dict: DictResp, item: DictItemResp) => void
  readonly onDeleteItem: (item: DictItemResp) => void
  readonly onEditDict: (dict: DictResp) => void
  readonly onDeleteDict: (dict: DictResp) => void
}

/** One dictionary as a collapsible group panel holding its items, like the infrastructure projects. */
export function DictGroup({
  dict,
  canCreateItem,
  canUpdateItem,
  canDeleteItem,
  canUpdateDict,
  canDeleteDict,
  onCreateItem,
  onEditItem,
  onDeleteItem,
  onEditDict,
  onDeleteDict
}: DictGroupProps) {
  const [open, setOpen] = React.useState(true)
  const [page, setPage] = React.useState(1)

  const query = useQuery({
    queryKey: dictKeys.itemList({ dictId: dict.id, page, size: PAGE_SIZE, sort: 'sort,asc' }),
    queryFn: ({ signal }) => listDictItems({ dictId: dict.id, page, size: PAGE_SIZE, sort: 'sort,asc' }, signal),
    enabled: open
  })

  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  React.useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount)
    }
  }, [page, pageCount])

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
    () =>
      createDictItemColumns({
        canUpdate: canUpdateItem,
        canDelete: canDeleteItem,
        onAction: handleAction
      }),
    [canUpdateItem, canDeleteItem, handleAction]
  )

  const canDeleteThisDict = canDeleteDict && !dict.isSystem
  const hasMenu = canCreateItem || canUpdateDict || canDeleteThisDict
  const items = query.data?.list ?? []

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col border-t">
      <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              className="group -ml-2 h-auto w-full justify-start gap-2 px-2 py-1 hover:bg-transparent aria-expanded:bg-transparent sm:flex-1"
            />
          }
        >
          <ChevronDown className="group-data-panel-open:rotate-180" />
          <span className="flex min-w-0 items-center gap-1.5 text-left">
            <span className="min-w-0 truncate text-sm font-medium">{dict.name}</span>
            <span className="max-w-40 shrink-0 truncate text-sm text-muted-foreground">({dict.code})</span>
            {dict.isSystem && (
              <Badge variant="outline" className="shrink-0 px-1 py-0 text-[10px] font-normal">
                内置
              </Badge>
            )}
            {dict.description && (
              <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground sm:block">
                {dict.description}
              </span>
            )}
          </span>
        </CollapsibleTrigger>

        {hasMenu && (
          <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="outline" size="icon-sm" />} />}>
                  <MoreHorizontal className="size-4" />
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  更多操作
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuGroup>
                  {canCreateItem && (
                    <DropdownMenuItem onClick={() => onCreateItem(dict)}>
                      <Plus />
                      新增字典项
                    </DropdownMenuItem>
                  )}
                  {canUpdateDict && (
                    <DropdownMenuItem onClick={() => onEditDict(dict)}>
                      <Pencil />
                      修改字典
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                {canDeleteThisDict && (
                  <>
                    {(canCreateItem || canUpdateDict) && <DropdownMenuSeparator />}
                    <DropdownMenuGroup>
                      <DropdownMenuItem variant="destructive" onClick={() => onDeleteDict(dict)}>
                        <Trash2 />
                        删除字典
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <CollapsibleContent>
        <DictTable
          items={items}
          columns={columns}
          isLoading={query.isPending}
          isError={query.isError}
          onRetry={() => void query.refetch()}
        />
        {pageCount > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2 text-xs text-muted-foreground">
            <span>共 {total} 项</span>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationArrow
                    direction="previous"
                    text="上一页"
                    disabled={page <= 1 || query.isFetching}
                    onClick={() => setPage(current => Math.max(1, current - 1))}
                  />
                </PaginationItem>
                <span className="px-2 tabular-nums">
                  第 {page} / {pageCount} 页
                </span>
                <PaginationItem>
                  <PaginationArrow
                    direction="next"
                    text="下一页"
                    disabled={page >= pageCount || query.isFetching}
                    onClick={() => setPage(current => Math.min(pageCount, current + 1))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
