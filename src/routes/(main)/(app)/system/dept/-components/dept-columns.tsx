import { z } from 'zod'
import { Building2, PenLine, Plus, Trash2 } from 'lucide-react'

import { FlagBadge } from '@/components/data-badge'
import { ParentTreeSelect } from '@/components/parent-tree-select'
import { TableDropdown, type ProColumns, type ProSchemaValueEnumType } from '@/components/pro'
import { Input } from '@/components/ui/input'
import { usePermission } from '@/hooks/use-permission'
import type { DeptResp } from '@/lib/api/dept'
import { toDeptNodeData } from '@/lib/dept-tree'

export type DeptAction = 'edit' | 'add-child' | 'delete'

interface DeptColumnOptions {
  deptTree?: DeptResp[]
  deptId?: string | number | null
}

export function deptColumns({ deptTree = [], deptId = null }: DeptColumnOptions = {}) {
  return [
    {
      title: '上级部门', dataIndex: 'parentId', hideInTable: true, order: 1, initialValue: '',
      convertValue: value => value ?? 0,
      formItemProps: (_form, { entity }) => {
        const root = entity !== undefined && (entity.parentId === 0 || entity.parentId === null)
        return {
          rules: z.union([z.string(), z.number()]).refine(value => value !== '', '请选择上级部门'),
          required: !root,
          description: root ? '根机构部门不支持变更上级部门' : undefined
        }
      },
      formItemRender: ({ entity }, { id, value, onChange, invalid }, form) =>
        entity && (entity.parentId === 0 || entity.parentId === null)
          ? <Input id={id} value="顶级部门（根机构）" disabled readOnly />
          : <ParentTreeSelect id={id} value={value as string | number | null} onChange={next => onChange(next ?? '')}
              data={deptTree} currentId={deptId} toNodeData={toDeptNodeData} disabled={form.isSubmitting}
              invalid={invalid} placeholder="选择上级部门" searchPlaceholder="搜索上级部门" emptyText="未找到相关部门" />
    },
    {
      title: '部门名称', dataIndex: 'name', hideInSetting: true,
      fieldProps: { placeholder: '请输入部门名称，例如：研发中心' },
      formItemProps: { rules: z.string().trim().min(1, '部门名称不能为空').max(30, '部门名称长度不能超过 30 个字符') },
      render: (_, dept) => <div className="flex items-center gap-2"><Building2 className="size-4 shrink-0 text-muted-foreground" /><span className="truncate text-sm text-foreground">{dept.name}</span></div>
    },
    {
      title: (_, type) => type === 'form' ? '部门状态' : '状态', dataIndex: 'status', valueType: 'switch', initialValue: 1, order: -1,
      valueEnum: new Map<1 | 2, ProSchemaValueEnumType>([[1, { text: '启用', status: 'Success' }], [2, { text: '禁用', status: 'Error' }]]),
      formItemProps: form => ({ rules: z.literal([1, 2]), required: false, description: form.getFieldValue('status') === 1
        ? '启用状态，允许部门下属人员正常访问' : '禁用状态，禁用后该部门直属用户会话将失效' })
    },
    {
      title: '排序', dataIndex: 'sort', valueType: 'digit', initialValue: 999,
      fieldProps: { min: 1, placeholder: '请输入排序值（越小越靠前）' },
      formItemProps: { rules: z.number({ error: '请输入排序' }).int().min(1, '排序最小值为 1') }
    },
    { title: '系统内置', dataIndex: 'isSystem', hideInForm: true,
      render: (_, dept) => <FlagBadge active={dept.isSystem} activeLabel="内置" inactiveLabel="自定义" /> },
    {
      title: (_, type) => type === 'form' ? '部门描述' : '描述', dataIndex: 'description', valueType: 'textarea', order: -2,
      fieldProps: { rows: 3, placeholder: '请输入部门描述信息（选填，最大 200 字）' },
      formItemProps: { rules: z.string().max(200, '描述长度不能超过 200 个字符').transform(value => value || undefined) }
    },
    { title: '创建人', dataIndex: 'createUserString', hideInForm: true },
    { title: '创建时间', dataIndex: 'createTime', valueType: 'dateTime', hideInForm: true },
    { title: '修改人', dataIndex: 'updateUserString', hideInForm: true },
    { title: '修改时间', dataIndex: 'updateTime', valueType: 'dateTime', hideInForm: true }
  ] as const satisfies readonly ProColumns<DeptResp>[]
}

function DeptRowActions({ dept, onAction }: { dept: DeptResp; onAction: (action: DeptAction, dept: DeptResp) => void }) {
  const { hasPermission } = usePermission()
  return <TableDropdown<DeptAction> onSelect={action => onAction(action, dept)} menus={[
    hasPermission('system:dept:update') && { key: 'edit', name: '修改部门', icon: <PenLine /> },
    hasPermission('system:dept:create') && { key: 'add-child', name: '添加下级', icon: <Plus /> },
    { type: 'divider' },
    hasPermission('system:dept:delete') && { key: 'delete', name: dept.isSystem ? '内置部门' : '删除', icon: <Trash2 />, danger: true,
      disabled: dept.isSystem }
  ]} />
}

export function createDeptColumns(onAction: (action: DeptAction, dept: DeptResp) => void): readonly ProColumns<DeptResp>[] {
  return [...deptColumns(), { title: '操作', valueType: 'option', render: (_, dept) => <DeptRowActions dept={dept} onAction={onAction} /> }]
}
