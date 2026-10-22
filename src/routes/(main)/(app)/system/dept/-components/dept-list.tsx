import * as React from 'react'

import { useMutation, useQuery } from '@tanstack/react-query'
import { type ColumnVisibilityState, type ExpandedState, useTable } from '@tanstack/react-table'

import { Search, X } from 'lucide-react'

import { DataTable } from '@/components/data-table'
import { ListPageCard } from '@/components/list-page-card'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { toast } from '@/components/ui/toast'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePermission } from '@/hooks/use-permission'
import { deptKeys, exportDept, getDeptTree, type DeptResp } from '@/lib/api/dept'
import { dataTableFeatures } from '@/lib/data-table-features'
import { reportError } from '@/lib/http'
import { cn } from 'cn'

import { createDeptColumns, type DeptAction } from './dept-columns'
import { DeptDeleteDialog } from './dept-delete-dialog'
import { DeptFormDrawer } from './dept-form-drawer'
import { DeptToolbar } from './dept-toolbar'

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibilityState = {
  createUserString: false,
  updateUserString: false,
  updateTime: false
}

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
  const keyword = searchInput.trim()

  // Table state
  const [expanded, setExpanded] = React.useState<ExpandedState>({})
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(DEFAULT_COLUMN_VISIBILITY)

  // Drawer & Dialog states
  const [formDeptId, setFormDeptId] = React.useState<string | number | null>(null)
  const [defaultParentId, setDefaultParentId] = React.useState<string | number | null>(null)
  const [isFormOpen, setIsFormOpen] = React.useState(false)

  const [deletingDept, setDeletingDept] = React.useState<DeptResp | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)

  const fullscreen = useFullscreenTransition()

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
    onError: error => reportError(error, '导出失败，请重试')
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

  const filters = (
    <InputGroup className="w-full sm:w-64">
      <InputGroupAddon>
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        className="text-sm"
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
            }}
            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            title="清空搜索"
          >
            <X className="size-3.5" />
          </button>
        </InputGroupAddon>
      )}
    </InputGroup>
  )

  const actions = (
    <DeptToolbar
      table={table}
      isRefreshing={query.isFetching}
      isExporting={exportMutation.isPending}
      isFullscreen={fullscreen.isFullscreen}
      isAllExpanded={isAllExpanded}
      hasCreatePermission={hasCreatePermission}
      hasExportPermission={hasExportPermission}
      onCreate={handleCreateNew}
      onExport={() => exportMutation.mutate()}
      onRefresh={() => void query.refetch()}
      onToggleExpandAll={handleToggleExpandAll}
      onToggleFullscreen={fullscreen.toggleFullscreen}
      onResetColumns={() => setColumnVisibility(DEFAULT_COLUMN_VISIBILITY)}
    />
  )

  return (
    <>
      <ListPageCard
        title="部门管理"
        description="管理系统组织架构、部门层级与人员归属"
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
