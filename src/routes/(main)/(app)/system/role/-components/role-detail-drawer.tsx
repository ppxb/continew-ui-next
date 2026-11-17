import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { UserShield } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { ProDescriptions } from '@/components/pro'
import { QueryState } from '@/components/query-state'
import { useLastRecord } from '@/hooks/use-last-record'
import { deptKeys, getDeptTree, type DeptResp } from '@/lib/api/dept'

import { roleColumns, type RoleEntity } from './role-columns'
import { useRoleDetail } from './use-role-detail'

function collectDeptNames(nodes: readonly DeptResp[], names: Map<string, string>) {
  for (const node of nodes) {
    names.set(String(node.id), node.name)
    if (node.children?.length) collectDeptNames(node.children, names)
  }
  return names
}

interface RoleDetailDrawerProps {
  readonly roleId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

export function RoleDetailDrawer({ roleId, open, onClose }: RoleDetailDrawerProps) {
  const query = useRoleDetail(roleId, { enabled: open })
  // Keep the last record while the drawer's close animation finishes.
  const lastDetail = useLastRecord(query.data ?? null)
  const detail = query.data ?? (open ? null : lastDetail)
  const depts = useQuery({
    queryKey: deptKeys.trees(),
    queryFn: ({ signal }) => getDeptTree(undefined, signal),
    enabled: open && detail?.dataScope === 5
  })
  const deptNames = React.useMemo(() => collectDeptNames(depts.data ?? [], new Map<string, string>()), [depts.data])
  const columns = React.useMemo(() => roleColumns({ deptNames, deptsLoading: depts.isPending && detail?.dataScope === 5 }), [deptNames, depts.isPending, detail?.dataScope])

  return (
    <EntityDrawer open={open} onClose={onClose} title="角色详情" icon={<UserShield className="size-4" />} width={32}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {query.isError || (!detail && !query.isPending) ? (
          <QueryState state="error" title="角色加载失败" onRetry={() => void query.refetch()} />
        ) : (
          <>
            {detail?.dataScope === 5 && depts.isError ? <QueryState state="error" title="权限部门加载失败" onRetry={() => void depts.refetch()} /> : null}
            <ProDescriptions<RoleEntity> columns={columns} dataSource={detail ?? undefined} loading={!detail && query.isPending} />
          </>
        )}
      </div>
    </EntityDrawer>
  )
}
