import * as React from 'react'

import { useMutation, useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type ExpandedState, useTable } from '@tanstack/react-table'

import { Search, X } from 'lucide-react'

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { toast } from '@/components/ui/toast'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import { deptKeys, exportDept, getDeptTree, type DeptResp } from '@/lib/api/dept'
import { dataTableFeatures } from '@/lib/data-table-features'
import { cn } from 'cn'

import { createDeptColumns, type DeptAction } from './dept-columns'
import { DeptDeleteDialog } from './dept-delete-dialog'
import { DeptFormDrawer } from './dept-form-drawer'
import { DeptTable } from './dept-table'
import { DeptToolbar } from './dept-toolbar'

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibilityState = {
  createUserString: false,
  updateUserString: false,
  updateTime: false
}

const SEARCH_DEBOUNCE_MS = 250
const EMPTY_TREE: DeptResp[] = []

/** Recursively filters tree nodes by name or description, preserving parent paths. */
function filterDeptTree(nodes: DeptResp[], keyword: string): DeptResp[] {
  const q = keyword.toLowerCase().trim()
  if (!q) return nodes

  function filterNode(node: DeptResp): DeptResp | null {
    const matchesKeyword =
      node.name.toLowerCase().includes(q) || Boolean(node.description && node.description.toLowerCase().includes(q))

    const filteredChildren: DeptResp[] = []
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

  const result: DeptResp[] = []
  for (const node of nodes) {
    const filtered = filterNode(node)
    if (filtered) {
      result.push(filtered)
    }
  }
  return result
}

export function DeptList() {
  const { hasPermission } = usePermission()

  const hasCreatePermission = hasPermission('system:dept:create')
  const hasUpdatePermission = hasPermission('system:dept:update')
  const hasDeletePermission = hasPermission('system:dept:delete')
  const hasExportPermission = hasPermission('system:dept:export')

  // Search state
  const [searchInput, setSearchInput] = React.useState('')
  const [keyword, setKeyword] = React.useState('')

  // Table state
  const [expanded, setExpanded] = React.useState<ExpandedState>({})
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(DEFAULT_COLUMN_VISIBILITY)

  // Drawer & Dialog states
  const [formDeptId, setFormDeptId] = React.useState<string | number | null>(null)
  const [defaultParentId, setDefaultParentId] = React.useState<string | number | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)

  const [deletingDept, setDeletingDept] = React.useState<DeptResp | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)

  const { isFullscreen, reservedHeight, fullscreenRef, spacerRef, toggleFullscreen } = useFullscreenTransition()

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch department tree
  const query = useQuery({
    queryKey: deptKeys.trees(),
    queryFn: () => getDeptTree()
  })

  const rawTree = query.data ?? EMPTY_TREE

  // Filter tree based on keyword search
  const filteredTree = React.useMemo(() => {
    if (!keyword) {
      return rawTree
    }
    return filterDeptTree(rawTree, keyword)
  }, [rawTree, keyword])

  // Automatically expand all matching branches when searching
  React.useEffect(() => {
    if (keyword) {
      setExpanded(true)
    }
  }, [keyword])

  const handleRowAction = React.useCallback((action: DeptAction, dept: DeptResp) => {
    if (action === 'edit') {
      setFormDeptId(dept.id)
      setDefaultParentId(null)
      setIsFormOpen(true)
      return
    }

    if (action === 'add-child') {
      setFormDeptId(null)
      setDefaultParentId(dept.id)
      setIsFormOpen(true)
      return
    }

    if (action === 'delete') {
      setDeletingDept(dept)
      setIsDeleteOpen(true)
      return
    }
  }, [])

  const columns = React.useMemo(
    () =>
      createDeptColumns({
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
    getSubRows: (row: DeptResp) => row.children,
    state: {
      expanded,
      columnVisibility
    },
    manualPagination: true,
    paginateExpandedRows: false,
    onExpandedChange: setExpanded,
    onColumnVisibilityChange: setColumnVisibility
  })

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      await exportDept({ description: keyword || undefined })
    },
    onSuccess: () => {
      toast.add({ title: '部门数据导出成功', type: 'success' })
    },
    onError: error => {
      toast.add({
        title: error instanceof Error ? error.message : '导出失败，请重试',
        type: 'error'
      })
    }
  })

  const handleCreateNew = () => {
    setFormDeptId(null)
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
      <DeptToolbar
        table={table}
        isRefreshing={query.isFetching}
        isExporting={exportMutation.isPending}
        isFullscreen={isFullscreen}
        isAllExpanded={isAllExpanded}
        hasCreatePermission={hasCreatePermission}
        hasExportPermission={hasExportPermission}
        onCreate={handleCreateNew}
        onExport={() => exportMutation.mutate()}
        onRefresh={() => void query.refetch()}
        onToggleExpandAll={handleToggleExpandAll}
        onToggleFullscreen={toggleFullscreen}
        onResetColumns={() => setColumnVisibility(DEFAULT_COLUMN_VISIBILITY)}
      />

      <DeptTable
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
          <div className="flex flex-col gap-1.5">
            <CardTitle>部门管理</CardTitle>
            <CardDescription>管理系统组织架构、部门层级与人员归属</CardDescription>
          </div>

          <CardAction className="flex flex-wrap items-center gap-2">
            <InputGroup className="w-full sm:w-64">
              <InputGroupAddon>
                <Search className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="搜索部门名称或描述"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <InputGroupAddon align="inline-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('')
                      setKeyword('')
                    }}
                    className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                    title="清空搜索"
                  >
                    <X className="size-3.5" />
                  </button>
                </InputGroupAddon>
              )}
            </InputGroup>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 p-0 pt-4 pb-0">{!isFullscreen && tableSection}</CardContent>
      </Card>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <>
          <div ref={spacerRef} style={{ height: reservedHeight }} />
          <div
            ref={fullscreenRef}
            className={cn(
              'fixed inset-0 z-50 flex flex-col bg-background p-4 md:p-6',
              'transition-all duration-200 ease-in-out'
            )}
          >
            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card pt-4">{tableSection}</div>
          </div>
        </>
      )}

      {/* Form Drawer */}
      <DeptFormDrawer
        deptId={formDeptId}
        defaultParentId={defaultParentId}
        open={isFormOpen}
        deptTree={rawTree}
        onClose={() => setIsFormOpen(false)}
      />

      {/* Delete Dialog */}
      <DeptDeleteDialog
        dept={deletingDept}
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={() => setDeletingDept(null)}
      />
    </>
  )
}
