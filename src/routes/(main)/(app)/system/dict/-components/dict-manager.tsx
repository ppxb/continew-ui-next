import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Bookmark } from 'lucide-react'

import { ListPageCard } from '@/components/list-page-card'
import { QueryState } from '@/components/query-state'
import { TableSearch } from '@/components/table-search'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import { clearDictCache, dictKeys, listDicts, type DictItemResp, type DictResp } from '@/lib/api/dict'

import { DictDeleteDialog, type DictDeleteTarget } from './dict-delete-dialog'
import { DictFormDrawer } from './dict-form-drawer'
import { DictItemFormDrawer } from './dict-item-form-drawer'
import { DictGroup } from './dict-panel'
import { DictToolbar } from './dict-toolbar'

interface ItemFormTarget {
  readonly dict: DictResp
  readonly item: DictItemResp | null
}

interface DictFormTarget {
  /** The dictionary being edited, or `null` to create one. */
  readonly dict: DictResp | null
}

/** Stable empty array, so the filter memo does not re-evaluate while the query is pending. */
const EMPTY_DICTS: DictResp[] = []

function DictGroupSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 border-t px-5 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Dictionary management in the storage-config shape: a searchable list of collapsible group tables. */
export function DictManager() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()
  const canCreateDict = hasPermission('system:dict:create')
  const canUpdateDict = hasPermission('system:dict:update')
  const canDeleteDict = hasPermission('system:dict:delete')
  const canClearCache = hasPermission('system:dict:clearCache')
  const canCreateItem = hasPermission('system:dictItem:create')
  const canUpdateItem = hasPermission('system:dictItem:update')
  const canDeleteItem = hasPermission('system:dictItem:delete')
  const fullscreen = useFullscreenTransition()

  const [keyword, setKeyword] = React.useState('')

  // One state per overlay: a null value means closed, and a null `dict` inside the form target
  // means 新增.
  const [dictFormTarget, setDictFormTarget] = React.useState<DictFormTarget | null>(null)
  const [itemFormTarget, setItemFormTarget] = React.useState<ItemFormTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<DictDeleteTarget | null>(null)

  const query = useQuery({
    queryKey: dictKeys.list(),
    queryFn: ({ signal }) => listDicts(undefined, signal)
  })

  const dicts = query.data ?? EMPTY_DICTS

  // The backend clears one dictionary code per call, so a global clear loops over every code.
  const clearCacheMutation = useMutation({
    mutationFn: (codes: string[]) => Promise.all(codes.map(code => clearDictCache(code))),
    onSuccess: () => {
      toast.add({ title: '字典缓存已成功清除', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: dictKeys.all })
    }
  })

  const filteredDicts = React.useMemo(() => {
    const needle = keyword.trim().toLowerCase()
    if (!needle) {
      return dicts
    }

    return dicts.filter(dict =>
      [dict.name, dict.code, dict.description ?? ''].some(value => value.toLowerCase().includes(needle))
    )
  }, [dicts, keyword])

  const handleRefresh = React.useCallback(() => {
    void query.refetch()
    void queryClient.invalidateQueries({ queryKey: dictKeys.items() })
  }, [query, queryClient])

  const filters = (
    <TableSearch
      className="col-span-2 h-8 w-full sm:w-64"
      placeholder="搜索名称、编码、描述"
      onSearch={setKeyword}
      clearable
    />
  )

  const actions = (
    <DictToolbar
      canCreate={canCreateDict}
      canClearCache={canClearCache && dicts.length > 0}
      isClearingCache={clearCacheMutation.isPending}
      isRefreshing={query.isFetching && !query.isPending}
      isFullscreen={fullscreen.isFullscreen}
      onCreate={() => setDictFormTarget({ dict: null })}
      onClearCache={() => clearCacheMutation.mutate(dicts.map(dict => dict.code))}
      onRefresh={handleRefresh}
      onToggleFullscreen={fullscreen.toggleFullscreen}
    />
  )

  return (
    <>
      <ListPageCard
        title="字典管理"
        description="维护系统字典和字典项，支持搜索、启停与清除缓存"
        filters={filters}
        actions={actions}
        fullscreen={fullscreen}
      >
        <div className="flex flex-col">
          {query.isPending ? (
            <DictGroupSkeleton />
          ) : query.isError ? (
            <QueryState
              state="error"
              title="字典加载失败"
              onRetry={() => void query.refetch()}
              className="min-h-40 rounded-none"
            />
          ) : filteredDicts.length === 0 ? (
            <Empty className="min-h-48 rounded-none">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Bookmark />
                </EmptyMedia>
                <EmptyTitle>{dicts.length === 0 ? '暂无字典' : '没有匹配的字典'}</EmptyTitle>
                <EmptyDescription>
                  {dicts.length === 0 ? '新增字典后即可维护字典项' : '试试其他关键词或筛选条件'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            filteredDicts.map(dict => (
              <DictGroup
                key={String(dict.id)}
                dict={dict}
                canCreateItem={canCreateItem}
                canUpdateItem={canUpdateItem}
                canDeleteItem={canDeleteItem}
                canUpdateDict={canUpdateDict}
                canDeleteDict={canDeleteDict}
                onCreateItem={target => setItemFormTarget({ dict: target, item: null })}
                onEditItem={(target, item) => setItemFormTarget({ dict: target, item })}
                onDeleteItem={item => setDeleteTarget({ type: 'item', item })}
                onEditDict={target => setDictFormTarget({ dict: target })}
                onDeleteDict={target => setDeleteTarget({ type: 'dict', dict: target })}
              />
            ))
          )}
        </div>
      </ListPageCard>

      <DictFormDrawer
        dict={dictFormTarget?.dict ?? null}
        open={dictFormTarget !== null}
        onClose={() => setDictFormTarget(null)}
      />
      <DictItemFormDrawer
        item={itemFormTarget?.item ?? null}
        dictId={itemFormTarget?.dict.id ?? ''}
        open={itemFormTarget !== null}
        onClose={() => setItemFormTarget(null)}
      />
      <DictDeleteDialog target={deleteTarget} open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} />
    </>
  )
}
