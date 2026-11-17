import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronsDownUp, ChevronsUpDown, Plus, Trash2 } from 'lucide-react'

import { ProTable } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { usePermission } from '@/hooks/use-permission'
import { clearMenuCache, getMenuTree, menuKeys, type MenuResp } from '@/lib/api/menu'
import { reportError } from '@/lib/http'

import { createMenuColumns, type MenuAction } from './menu-columns'
import { MenuDeleteDialog } from './menu-delete-dialog'
import { MenuFormDrawer } from './menu-form-drawer'

const EMPTY_TREE: MenuResp[] = []

/** Retain matching names, routes and permissions together with their parent paths. */
function filterMenuTree(nodes: MenuResp[], keyword: string): MenuResp[] {
  const q = keyword.toLowerCase().trim()
  if (!q) return nodes
  return nodes.flatMap(node => {
    const children = filterMenuTree(node.children ?? [], q)
    const matches = node.title.toLowerCase().includes(q) || Boolean(node.path?.toLowerCase().includes(q)) || Boolean(node.permission?.toLowerCase().includes(q))
    return matches || children.length > 0 ? [{ ...node, children }] : []
  })
}

function expandableMenuIds(nodes: MenuResp[]): string[] {
  return nodes.flatMap(node => node.children?.length ? [String(node.id), ...expandableMenuIds(node.children)] : [])
}

interface FormTarget {
  readonly menuId: string | number | null
  readonly parentId: string | number | null
}

export function MenuList() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()
  const [keyword, setKeyword] = React.useState('')
  const [expanded, setExpanded] = React.useState<string[] | 'all'>([])
  const [formTarget, setFormTarget] = React.useState<FormTarget | null>(null)
  const [deletingMenu, setDeletingMenu] = React.useState<MenuResp | null>(null)
  const query = useQuery({ queryKey: menuKeys.trees(), queryFn: ({ signal }) => getMenuTree(undefined, signal) })
  const rawTree = query.data ?? EMPTY_TREE
  const filteredTree = React.useMemo(() => filterMenuTree(rawTree, keyword), [rawTree, keyword])
  const expandedRowKeys = React.useMemo(() => expanded === 'all' ? expandableMenuIds(filteredTree) : expanded, [expanded, filteredTree])
  const handleRowAction = React.useCallback((action: MenuAction, menu: MenuResp) => {
    if (action === 'edit') setFormTarget({ menuId: menu.id, parentId: null })
    else if (action === 'add-child') setFormTarget({ menuId: null, parentId: menu.id })
    else setDeletingMenu(menu)
  }, [])
  const columns = React.useMemo(() => createMenuColumns(handleRowAction), [handleRowAction])
  const clearCacheMutation = useMutation({
    mutationFn: () => clearMenuCache(),
    onSuccess: () => {
      toast.add({ title: '菜单缓存已成功清除', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: menuKeys.trees() })
    },
    onError: error => reportError(error, '清除缓存失败，请重试')
  })
  const isExpanded = expanded === 'all' || expanded.length > 0
  return <>
    <ProTable<MenuResp> columns={columns} rowKey="id" dataSource={filteredTree} queryKey={menuKeys.trees()} pagination={false}
      params={{ keyword }} loading={query.isPending || query.isFetching} isError={query.isError} isShowingPreviousRows={query.isPlaceholderData}
      headerTitle="菜单管理" toolbar={{ subTitle: '配置系统目录、路由页面与按钮权限' }}
      expandable={{ expandedRowKeys, onExpandedRowsChange: setExpanded }}
      options={{ search: { placeholder: '搜索名称、路由、权限', delay: 0, onSearch: next => {
        setKeyword(next)
        if (next) setExpanded('all')
        return false
      } } }}
      toolBarRender={() => [
        hasPermission('system:menu:create') && <Button key="create" onClick={() => setFormTarget({ menuId: null, parentId: null })}><Plus />新增菜单</Button>,
        hasPermission('system:menu:clearCache') && <Button key="clear" variant="outline" disabled={clearCacheMutation.isPending} onClick={() => clearCacheMutation.mutate()}
          className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300">
          {clearCacheMutation.isPending ? <Spinner /> : <Trash2 />}清除缓存
        </Button>,
        <Button key="expand" variant="outline" size="icon" onClick={() => setExpanded(isExpanded ? [] : 'all')}>
          {isExpanded ? <ChevronsDownUp /> : <ChevronsUpDown />}
        </Button>
      ]}
    />
    <MenuFormDrawer menuId={formTarget?.menuId ?? null} defaultParentId={formTarget?.parentId ?? null}
      open={formTarget !== null} onClose={() => setFormTarget(null)} menuTree={rawTree} />
    <MenuDeleteDialog menu={deletingMenu} open={deletingMenu !== null} onClose={() => setDeletingMenu(null)} />
  </>
}
