import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnVisibilityState, type ExpandedState, useTable } from '@tanstack/react-table'

import { Search, X } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { ListPageCard } from '@/components/list-page-card'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { toast } from '@/components/ui/toast'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import { clearMenuCache, getMenuTree, menuKeys, type MenuResp } from '@/lib/api/menu'
import { dataTableFeatures } from '@/lib/data-table-features'
import { reportError } from '@/lib/http'
import { cn } from 'cn'

import { createMenuColumns, type MenuAction } from './menu-columns'
import { MenuDeleteDialog } from './menu-delete-dialog'
import { MenuFormDrawer } from './menu-form-drawer'
import { MenuToolbar } from './menu-toolbar'

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibilityState = {}

const EMPTY_TREE: MenuResp[] = []

/** Recursively filters tree nodes by title, path, or permission code, preserving parent paths. */
function filterMenuTree(nodes: MenuResp[], keyword: string): MenuResp[] {
  const q = keyword.toLowerCase().trim()
  if (!q) return nodes

  function filterNode(node: MenuResp): MenuResp | null {
    const matchesKeyword =
      node.title.toLowerCase().includes(q) ||
      (node.path && node.path.toLowerCase().includes(q)) ||
      (node.permission && node.permission.toLowerCase().includes(q))

    const filteredChildren: MenuResp[] = []
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const matchingChild = filterNode(child)
        if (matchingChild) {
          filteredChildren.push(matchingChild)
        }
      }
    }

    if (matchesKeyword || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren
      }
    }

    return null
  }

  const result: MenuResp[] = []
  for (const node of nodes) {
    const filtered = filterNode(node)
    if (filtered) {
      result.push(filtered)
    }
  }
  return result
}

export function MenuList() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()

  const hasCreatePermission = hasPermission('system:menu:create')
  const hasUpdatePermission = hasPermission('system:menu:update')
  const hasDeletePermission = hasPermission('system:menu:delete')
  const hasClearCachePermission = hasPermission('system:menu:clearCache')

  // Search state
  const [searchInput, setSearchInput] = React.useState('')
  const keyword = searchInput.trim()

  // Table state
  const [expanded, setExpanded] = React.useState<ExpandedState>({})
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(DEFAULT_COLUMN_VISIBILITY)

  // Drawer & Dialog states
  const [formMenuId, setFormMenuId] = React.useState<string | number | null>(null)
  const [defaultParentId, setDefaultParentId] = React.useState<string | number | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)

  const [deletingMenu, setDeletingMenu] = React.useState<MenuResp | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)

  const fullscreen = useFullscreenTransition()

  // Fetch menu tree
  const query = useQuery({
    queryKey: menuKeys.trees(),
    queryFn: ({ signal }) => getMenuTree(undefined, signal)
  })

  const rawTree = query.data ?? EMPTY_TREE

  // Filter tree based on keyword search
  const filteredTree = React.useMemo(() => {
    if (!keyword) {
      return rawTree
    }
    return filterMenuTree(rawTree, keyword)
  }, [rawTree, keyword])

  // Automatically expand all matching branches when searching
  React.useEffect(() => {
    if (keyword) {
      setExpanded(true)
    }
  }, [keyword])

  const handleRowAction = React.useCallback((action: MenuAction, menu: MenuResp) => {
    if (action === 'edit') {
      setFormMenuId(menu.id)
      setDefaultParentId(null)
      setIsFormOpen(true)
      return
    }

    if (action === 'add-child') {
      setFormMenuId(null)
      setDefaultParentId(menu.id)
      setIsFormOpen(true)
      return
    }

    if (action === 'delete') {
      setDeletingMenu(menu)
      setIsDeleteOpen(true)
      return
    }
  }, [])

  const columns = React.useMemo(
    () =>
      createMenuColumns({
        onAction: handleRowAction,
        hasCreatePermission,
        hasUpdatePermission,
        hasDeletePermission
      }),
    [handleRowAction, hasCreatePermission, hasUpdatePermission, hasDeletePermission]
  )

  const table = useTable({
    features: dataTableFeatures,
    data: filteredTree,
    columns,
    getSubRows: (row: MenuResp) => row.children,
    state: {
      expanded,
      columnVisibility
    },
    manualPagination: true,
    paginateExpandedRows: false,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility
  })

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: () => clearMenuCache(),
    onSuccess: () => {
      toast.add({ title: '菜单缓存已成功清除', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: menuKeys.trees() })
    },
    onError: error => reportError(error, '清除缓存失败，请重试')
  })

  const handleCreateNew = () => {
    setFormMenuId(null)
    setDefaultParentId(null)
    setIsFormOpen(true)
  }

  const handleToggleExpandAll = () => {
    if (expanded === true || (typeof expanded === 'object' && Object.keys(expanded).length > 0)) {
      setExpanded({})
    } else {
      setExpanded(true)
    }
  }

  const isAllExpanded = expanded === true || (typeof expanded === 'object' && Object.keys(expanded).length > 0)

  const filters = (
    <InputGroup className="w-full md:w-64">
      <InputGroupAddon align="inline-start">
        <Search className="size-3.5" />
      </InputGroupAddon>
      <InputGroupInput
        className="text-sm"
        placeholder="搜索名称、路由、权限"
        value={searchInput}
        onChange={event => setSearchInput(event.target.value)}
      />
      {searchInput ? (
        <InputGroupAddon align="inline-end">
          <Button type="button" variant="ghost" size="icon-xs" aria-label="清空搜索" onClick={() => setSearchInput('')}>
            <X className="size-3" />
          </Button>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )

  const actions = (
    <MenuToolbar
      table={table}
      isRefreshing={query.isFetching}
      isFullscreen={fullscreen.isFullscreen}
      isAllExpanded={isAllExpanded}
      isClearingCache={clearCacheMutation.isPending}
      hasCreatePermission={hasCreatePermission}
      hasClearCachePermission={hasClearCachePermission}
      onCreate={handleCreateNew}
      onRefresh={() => void query.refetch()}
      onToggleExpandAll={handleToggleExpandAll}
      onClearCache={() => clearCacheMutation.mutate()}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility(DEFAULT_COLUMN_VISIBILITY)}
    />
  )

  return (
    <>
      <ListPageCard
        title="菜单管理"
        description="配置系统目录、路由页面与按钮权限"
        filters={filters}
        actions={actions}
        fullscreen={fullscreen}
      >
        <DataTable
          table={table}
          isLoading={query.isPending}
          isError={query.isError}
          isShowingPreviousRows={query.isPlaceholderData}
          onRetry={() => void query.refetch()}
          stickyHeader
          showPagination={false}
          skeletonWidths={['w-48', 'w-12', 'w-20']}
          containerClassName={cn(
            '*:data-[slot=table-container]:overflow-auto',
            fullscreen.isFullscreen
              ? '*:data-[slot=table-container]:h-[calc(100vh-6.5rem)] *:data-[slot=table-container]:max-h-[calc(100vh-6.5rem)]'
              : '*:data-[slot=table-container]:max-h-[calc(100vh-17rem)] md:*:data-[slot=table-container]:max-h-[calc(100dvh-17rem)]'
          )}
        />
      </ListPageCard>

      {/* Form Drawer */}
      <MenuFormDrawer
        menuId={formMenuId}
        defaultParentId={defaultParentId}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        menuTree={rawTree}
      />

      {/* Delete Dialog */}
      <MenuDeleteDialog menu={deletingMenu} open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} />
    </>
  )
}
