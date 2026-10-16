import * as React from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ColumnVisibilityState, type ExpandedState, useTable } from '@tanstack/react-table'

import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { toast } from '@/components/ui/toast'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import { clearMenuCache, getMenuTree, menuKeys, type MenuResp } from '@/lib/api/menu'
import { dataTableFeatures } from '@/lib/data-table-features'
import { cn } from 'cn'

import { createMenuColumns, type MenuAction } from './menu-columns'
import { MenuDeleteDialog } from './menu-delete-dialog'
import { MenuFormDrawer } from './menu-form-drawer'
import { MenuTable } from './menu-table'
import { MenuToolbar } from './menu-toolbar'

const HIDDEN_BY_DEFAULT: ColumnVisibilityState = {
  component: false,
  isExternal: false,
  isCache: false,
  sort: false
}

const SEARCH_DEBOUNCE_MS = 250
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
  const [keyword, setKeyword] = React.useState('')

  // Table state
  const [expanded, setExpanded] = React.useState<ExpandedState>({})
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(HIDDEN_BY_DEFAULT)

  // Drawer & Dialog states
  const [formMenuId, setFormMenuId] = React.useState<string | number | null>(null)
  const [defaultParentId, setDefaultParentId] = React.useState<string | number | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)

  const [deletingMenu, setDeletingMenu] = React.useState<MenuResp | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)

  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch menu tree
  const query = useQuery({
    queryKey: menuKeys.trees(),
    queryFn: () => getMenuTree()
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
    onError: error => {
      toast.add({
        title: error instanceof Error ? error.message : '清除缓存失败，请重试',
        type: 'error'
      })
    }
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

  const tableSection = (
    <>
      <MenuToolbar
        table={table}
        isRefreshing={query.isFetching}
        isFullscreen={isFullscreen}
        isAllExpanded={isAllExpanded}
        isClearingCache={clearCacheMutation.isPending}
        hasCreatePermission={hasCreatePermission}
        hasClearCachePermission={hasClearCachePermission}
        onCreate={handleCreateNew}
        onRefresh={() => void query.refetch()}
        onToggleExpandAll={handleToggleExpandAll}
        onClearCache={() => clearCacheMutation.mutate()}
        onToggleFullscreen={toggleFullscreen}
        onResetColumns={() => setColumnVisibility(HIDDEN_BY_DEFAULT)}
      />

      <MenuTable
        table={table}
        isLoading={query.isPending}
        isError={query.isError}
        isStale={query.isPlaceholderData}
        isFullscreen={isFullscreen}
        onRetry={() => void query.refetch()}
      />
    </>
  )

  return (
    <>
      <Card className="pb-0">
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">菜单管理</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            配置系统目录、路由页面与按钮鉴权标识，层级管理导航树
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="搜索名称、路由、权限"
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
              />
              {searchInput ? (
                <InputGroupAddon align="inline-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="清空搜索"
                    onClick={() => setSearchInput('')}
                  >
                    <X className="size-3" />
                  </Button>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0 pb-0">
          {isFullscreen ? <div ref={spacerRef} style={{ height: reservedHeight }} /> : null}

          <div ref={fullscreenRef} className={cn('flex flex-col gap-4', isFullscreen && 'bg-background')}>
            {tableSection}
          </div>
        </CardContent>
      </Card>

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
