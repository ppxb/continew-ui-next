import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Bookmark, RefreshCw, Search } from 'lucide-react'

import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
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

/** Stable empty array, so the filter memo does not re-evaluate while the query is pending. */
const EMPTY_DICTS: DictResp[] = []

function DictGroupSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t pt-3">
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
  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

  const [searchInput, setSearchInput] = React.useState('')

  const [dictFormOpen, setDictFormOpen] = React.useState(false)
  const [editingDict, setEditingDict] = React.useState<DictResp | null>(null)
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
    const keyword = searchInput.trim().toLowerCase()
    if (!keyword) {
      return dicts
    }

    return dicts.filter(dict =>
      [dict.name, dict.code, dict.description ?? ''].some(value => value.toLowerCase().includes(keyword))
    )
  }, [dicts, searchInput])

  const hasActiveFilters = searchInput.trim() !== ''

  const handleResetFilters = React.useCallback(() => {
    setSearchInput('')
  }, [])

  const handleRefresh = React.useCallback(() => {
    void query.refetch()
    void queryClient.invalidateQueries({ queryKey: dictKeys.items() })
  }, [query, queryClient])

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-xl leading-none">字典管理</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            维护系统字典和字典项，支持搜索、启停与清除缓存
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          {isFullscreen ? <div ref={spacerRef} style={{ height: reservedHeight }} /> : null}

          <div ref={fullscreenRef} className={cn('flex flex-col gap-4', isFullscreen && 'bg-background')}>
            <div className="flex flex-wrap items-center gap-3 px-4">
              <InputGroup className="h-8 w-full md:w-64">
                <InputGroupAddon align="inline-start">
                  <Search className="size-3.5" />
                </InputGroupAddon>
                <InputGroupInput
                  className="h-8"
                  placeholder="搜索名称、编码、描述"
                  value={searchInput}
                  onChange={event => setSearchInput(event.target.value)}
                />
              </InputGroup>

              {hasActiveFilters ? (
                <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={handleResetFilters}>
                  <RefreshCw className="size-3.5" />
                  重置
                </Button>
              ) : null}
            </div>

            <DictToolbar
              canCreate={canCreateDict}
              canClearCache={canClearCache && dicts.length > 0}
              isClearingCache={clearCacheMutation.isPending}
              isRefreshing={query.isFetching && !query.isPending}
              isFullscreen={isFullscreen}
              onCreate={() => {
                setEditingDict(null)
                setDictFormOpen(true)
              }}
              onClearCache={() => clearCacheMutation.mutate(dicts.map(dict => dict.code))}
              onRefresh={handleRefresh}
              onToggleFullscreen={toggleFullscreen}
            />

            <div className="flex flex-col gap-4 px-4">
              {query.isPending ? (
                <DictGroupSkeleton />
              ) : query.isError ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border bg-card">
                  <span className="text-sm text-muted-foreground">字典加载失败</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
                    重新加载
                  </Button>
                </div>
              ) : filteredDicts.length === 0 ? (
                <Empty className="min-h-48 rounded-xl border bg-card">
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
                    defaultOpen
                    canCreateItem={canCreateItem}
                    canUpdateItem={canUpdateItem}
                    canDeleteItem={canDeleteItem}
                    canUpdateDict={canUpdateDict}
                    canDeleteDict={canDeleteDict}
                    onCreateItem={target => setItemFormTarget({ dict: target, item: null })}
                    onEditItem={(target, item) => setItemFormTarget({ dict: target, item })}
                    onDeleteItem={item => setDeleteTarget({ type: 'item', item })}
                    onEditDict={target => {
                      setEditingDict(target)
                      setDictFormOpen(true)
                    }}
                    onDeleteDict={target => setDeleteTarget({ type: 'dict', dict: target })}
                  />
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <DictFormDrawer dict={editingDict} open={dictFormOpen} onClose={() => setDictFormOpen(false)} />
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
