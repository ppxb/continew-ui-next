import * as React from 'react'

import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronsDownUp, ChevronsUpDown, Download, Plus } from 'lucide-react'

import { ProTable } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { usePermission } from '@/hooks/use-permission'
import { deptKeys, exportDept, getDeptTree, type DeptResp } from '@/lib/api/dept'
import { reportError } from '@/lib/http'

import { createDeptColumns, type DeptAction } from './dept-columns'
import { DeptDeleteDialog } from './dept-delete-dialog'
import { DeptFormDrawer } from './dept-form-drawer'

const EMPTY_TREE: DeptResp[] = []
const HIDDEN_BY_DEFAULT = {
  createUserString: { show: false },
  updateUserString: { show: false },
  updateTime: { show: false }
}

/** Retain matching nodes and their parent paths, not unrelated descendants. */
function filterDeptTree(nodes: DeptResp[], keyword: string): DeptResp[] {
  const q = keyword.toLowerCase().trim()
  if (!q) return nodes
  return nodes.flatMap(node => {
    const children = filterDeptTree(node.children ?? [], q)
    const matches = node.name.toLowerCase().includes(q) || Boolean(node.description?.toLowerCase().includes(q))
    return matches || children.length > 0 ? [{ ...node, children }] : []
  })
}

function expandableDeptIds(nodes: DeptResp[]): string[] {
  return nodes.flatMap(node => (node.children?.length ? [String(node.id), ...expandableDeptIds(node.children)] : []))
}

interface FormTarget {
  readonly deptId: string | number | null
  readonly parentId: string | number | null
}

export function DeptList() {
  const { hasPermission } = usePermission()
  const [keyword, setKeyword] = React.useState('')
  const [expanded, setExpanded] = React.useState<string[] | 'all'>([])
  const [formTarget, setFormTarget] = React.useState<FormTarget | null>(null)
  const [deletingDept, setDeletingDept] = React.useState<DeptResp | null>(null)
  const query = useQuery({ queryKey: deptKeys.trees(), queryFn: ({ signal }) => getDeptTree(undefined, signal) })
  const rawTree = query.data ?? EMPTY_TREE
  const filteredTree = React.useMemo(() => filterDeptTree(rawTree, keyword), [rawTree, keyword])
  const expandedRowKeys = React.useMemo(
    () => (expanded === 'all' ? expandableDeptIds(filteredTree) : expanded),
    [expanded, filteredTree]
  )

  const handleRowAction = React.useCallback((action: DeptAction, dept: DeptResp) => {
    if (action === 'edit') setFormTarget({ deptId: dept.id, parentId: null })
    else if (action === 'add-child') setFormTarget({ deptId: null, parentId: dept.id })
    else setDeletingDept(dept)
  }, [])
  const columns = React.useMemo(() => createDeptColumns(handleRowAction), [handleRowAction])
  const exportMutation = useMutation({
    mutationFn: () => exportDept({ description: keyword || undefined }),
    onSuccess: () => {
      toast.add({ title: '部门数据导出成功', type: 'success' })
    },
    onError: error => reportError(error, '导出失败，请重试')
  })
  const isExpanded = expanded === 'all' || expanded.length > 0

  return (
    <>
      <ProTable<DeptResp>
        columns={columns}
        rowKey="id"
        dataSource={filteredTree}
        queryKey={deptKeys.trees()}
        disabledColumnKeys={['name']}
        params={{ description: keyword || undefined }}
        pagination={false}
        loading={query.isPending || query.isFetching}
        isError={query.isError}
        isShowingPreviousRows={query.isPlaceholderData}
        headerTitle="部门管理"
        toolbar={{ subTitle: '管理系统组织架构及部门层级' }}
        columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
        expandable={{ expandedRowKeys, onExpandedRowsChange: setExpanded }}
        options={{
          search: {
            placeholder: '搜索部门名称或描述',
            delay: 0,
            onSearch: next => {
              setKeyword(next)
              if (next) setExpanded('all')
              return false
            }
          }
        }}
        toolBarRender={() => [
          hasPermission('system:dept:create') && (
            <Button key="create" onClick={() => setFormTarget({ deptId: null, parentId: null })}>
              <Plus />
              新增部门
            </Button>
          ),
          hasPermission('system:dept:export') && (
            <Button
              key="export"
              variant="outline"
              size="icon"
              disabled={exportMutation.isPending}
              onClick={() => exportMutation.mutate()}
            >
              {exportMutation.isPending ? <Spinner /> : <Download />}
            </Button>
          ),
          <Button key="expand" variant="outline" size="icon" onClick={() => setExpanded(isExpanded ? [] : 'all')}>
            {isExpanded ? <ChevronsDownUp /> : <ChevronsUpDown />}
          </Button>
        ]}
      />
      <DeptFormDrawer
        deptId={formTarget?.deptId ?? null}
        defaultParentId={formTarget?.parentId ?? null}
        open={formTarget !== null}
        deptTree={rawTree}
        onClose={() => setFormTarget(null)}
      />
      <DeptDeleteDialog
        dept={deletingDept}
        allDepts={rawTree}
        open={deletingDept !== null}
        onClose={() => setDeletingDept(null)}
      />
    </>
  )
}
