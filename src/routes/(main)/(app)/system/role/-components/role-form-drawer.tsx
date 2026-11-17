import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserShield } from 'lucide-react'

import type { CheckableTreeNode } from '@/components/checkable-tree'
import { BetaSchemaForm } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { deptKeys, getDeptTree, type DeptResp } from '@/lib/api/dept'
import { createRole, getRole, roleKeys, updateRole } from '@/lib/api/role'

import { roleColumns, toRolePayload, type RoleEntity } from './role-columns'

function toCheckableDeptNodes(nodes: DeptResp[]): CheckableTreeNode[] {
  return nodes.map(node => ({
    id: String(node.id), parentId: node.parentId ? String(node.parentId) : null, label: node.name,
    children: node.children?.length ? toCheckableDeptNodes(node.children) : undefined
  }))
}

interface RoleFormDrawerProps {
  readonly roleId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

export function RoleFormDrawer({ roleId, open, onClose }: RoleFormDrawerProps) {
  const queryClient = useQueryClient()
  const depts = useQuery({ queryKey: deptKeys.trees(), queryFn: ({ signal }) => getDeptTree(undefined, signal), enabled: open })
  const deptTree = React.useMemo(() => toCheckableDeptNodes(depts.data ?? []), [depts.data])
  const columns = React.useMemo(() => roleColumns({ deptTree, deptsLoading: depts.isPending }), [deptTree, depts.isPending])
  return <BetaSchemaForm<RoleEntity, typeof columns> layoutType="DrawerForm" title={roleId === null ? '新增角色' : '修改角色'}
    width={32} drawerProps={{ icon: <UserShield className="size-4" /> }} open={open} onOpenChange={next => { if (!next) onClose() }}
    columns={columns} queryKey={roleKeys.detail(roleId)} request={roleId === null ? undefined : (_params, signal) => getRole(roleId, signal)}
    formItemsRender={items => items.map(item => {
      if (item.name === 'deptIds') return null
      if (item.name === 'deptCheckStrictly') return <div key="custom-departments" className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
        {item.dom}
        {items.find(field => field.name === 'deptIds')?.dom}
      </div>
      return <React.Fragment key={item.name}>{item.dom}</React.Fragment>
    })}
    onFinish={async values => {
      const payload = toRolePayload(values)
      if (roleId === null) await createRole(payload)
      else await updateRole(roleId, payload)
      toast.add({ title: roleId === null ? '新增角色成功' : '修改角色成功', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: roleKeys.all })
      return true
    }}
  />
}
