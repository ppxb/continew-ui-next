import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'

import { BetaSchemaForm, type ProFormInstance } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { createDept, deptKeys, getDept, type DeptReq, type DeptResp, updateDept } from '@/lib/api/dept'

import { deptColumns } from './dept-columns'

interface DeptFormDrawerProps {
  readonly deptId: string | number | null
  readonly defaultParentId?: string | number | null
  readonly open: boolean
  readonly deptTree: DeptResp[]
  readonly onClose: () => void
}

export function DeptFormDrawer({ deptId, defaultParentId, open, deptTree, onClose }: DeptFormDrawerProps) {
  const queryClient = useQueryClient()
  const columns = React.useMemo(() => deptColumns({ deptTree, deptId }), [deptTree, deptId])
  const formRef = React.useRef<ProFormInstance>(undefined)
  const parentFilled = React.useRef(false)
  const createParentId = defaultParentId ?? deptTree[0]?.id ?? null
  React.useEffect(() => {
    if (!open) {
      parentFilled.current = false
      return
    }
    if (deptId === null && !parentFilled.current && createParentId !== null && formRef.current) {
      formRef.current.setFieldsValue({ parentId: createParentId })
      parentFilled.current = true
    }
  }, [open, deptId, createParentId])

  return (
    <BetaSchemaForm<DeptResp, typeof columns>
      layoutType="DrawerForm"
      title={deptId === null ? '新增部门' : '修改部门'}
      width={30}
      drawerProps={{ icon: <Building2 className="size-4" /> }}
      open={open}
      onOpenChange={next => {
        if (!next) onClose()
      }}
      columns={columns}
      formRef={formRef}
      initialValues={{ parentId: createParentId ?? '' }}
      queryKey={deptKeys.detail(deptId)}
      request={deptId === null ? undefined : (_params, signal) => getDept(deptId, signal)}
      onFinish={async values => {
        const payload: DeptReq = {
          // The parent column validates string/number IDs, including the root's numeric zero.
          parentId: values.parentId as string | number,
          name: values.name,
          sort: values.sort,
          status: values.status,
          description: values.description
        }
        if (deptId === null) await createDept(payload)
        else await updateDept(deptId, payload)
        void queryClient.invalidateQueries({ queryKey: deptKeys.all })
        toast.add({ title: deptId === null ? '新增部门成功' : '修改部门成功', type: 'success' })
        return true
      }}
    />
  )
}
