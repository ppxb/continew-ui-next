import { useQueryClient } from '@tanstack/react-query'
import { ListChecks } from 'lucide-react'

import { BetaSchemaForm } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import {
  createDictItem,
  dictKeys,
  updateDictItem,
  type DictItemReq,
  type DictItemResp,
  type DictResp
} from '@/lib/api/dict'

import { dictItemColumns } from './dict-columns'

interface DictItemFormDrawerProps {
  readonly item: DictItemResp | null
  /** The dictionary the item belongs to; its `code` also drives `dictKeys.code` invalidation. */
  readonly dict: DictResp | null
  readonly open: boolean
  readonly onClose: () => void
}

export function DictItemFormDrawer({ item, dict, open, onClose }: DictItemFormDrawerProps) {
  const queryClient = useQueryClient()
  return (
    <BetaSchemaForm<DictItemResp, typeof dictItemColumns>
      layoutType="DrawerForm"
      title={item ? '修改字典项' : '新增字典项'}
      width={32}
      grid
      drawerProps={{ icon: <ListChecks className="size-4" /> }}
      open={open}
      onOpenChange={next => {
        if (!next) onClose()
      }}
      columns={dictItemColumns}
      queryKey={[...dictKeys.items(), 'form', dict?.id ?? null, item?.id ?? null]}
      initialValues={item ? { ...item, color: item.color || 'none', description: item.description ?? '' } : undefined}
      submitter={{ searchConfig: { submitText: item ? '保存' : '创建' } }}
      onFinish={async values => {
        if (!dict) return false
        const body: DictItemReq = { ...values, dictId: item?.dictId ?? dict.id }
        if (item) await updateDictItem(item.id, body)
        else await createDictItem(body)
        toast.add({ title: item ? '修改成功' : '新增成功', type: 'success' })
        void queryClient.invalidateQueries({ queryKey: dictKeys.items() })
        void queryClient.invalidateQueries({ queryKey: dictKeys.code(dict.code) })
        return true
      }}
    />
  )
}
