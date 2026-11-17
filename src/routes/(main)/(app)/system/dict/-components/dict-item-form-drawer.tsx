import { useQueryClient } from '@tanstack/react-query'
import { ListChecks } from 'lucide-react'

import { BetaSchemaForm } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { createDictItem, dictKeys, updateDictItem, type DictItemReq, type DictItemResp } from '@/lib/api/dict'

import { dictItemColumns } from './dict-columns'

interface DictItemFormDrawerProps {
  readonly item: DictItemResp | null
  readonly dictId: string | number
  readonly open: boolean
  readonly onClose: () => void
}

export function DictItemFormDrawer({ item, dictId, open, onClose }: DictItemFormDrawerProps) {
  const queryClient = useQueryClient()
  return (
    <BetaSchemaForm<DictItemResp, typeof dictItemColumns>
      layoutType="DrawerForm"
      title={item ? '修改字典项' : '新增字典项'}
      width={32}
      grid
      drawerProps={{ icon: <ListChecks className="size-4" /> }}
      open={open}
      onOpenChange={next => { if (!next) onClose() }}
      columns={dictItemColumns}
      queryKey={[...dictKeys.items(), 'form', dictId, item?.id ?? null]}
      initialValues={item ? { ...item, color: item.color || 'none', description: item.description ?? '' } : undefined}
      submitter={{ searchConfig: { submitText: item ? '保存' : '创建' } }}
      onFinish={async values => {
        const body: DictItemReq = { ...values, dictId: item?.dictId ?? dictId }
        if (item) await updateDictItem(item.id, body)
        else await createDictItem(body)
        toast.add({ title: item ? '修改成功' : '新增成功', type: 'success' })
        void queryClient.invalidateQueries({ queryKey: dictKeys.items() })
        return true
      }}
    />
  )
}
