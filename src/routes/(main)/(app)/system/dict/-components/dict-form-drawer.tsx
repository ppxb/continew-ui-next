import { useQueryClient } from '@tanstack/react-query'
import { Bookmark } from 'lucide-react'

import { BetaSchemaForm } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { createDict, dictKeys, updateDict, type DictResp } from '@/lib/api/dict'

import { dictColumns } from './dict-columns'

interface DictFormDrawerProps {
  readonly dict: DictResp | null
  readonly open: boolean
  readonly onClose: () => void
}

export function DictFormDrawer({ dict, open, onClose }: DictFormDrawerProps) {
  const queryClient = useQueryClient()
  return (
    <BetaSchemaForm<DictResp, typeof dictColumns>
      layoutType="DrawerForm"
      title={dict ? '修改字典' : '新增字典'}
      width={32}
      grid
      drawerProps={{ icon: <Bookmark className="size-4" /> }}
      open={open}
      onOpenChange={next => {
        if (!next) onClose()
      }}
      columns={dictColumns}
      queryKey={[...dictKeys.lists(), 'form', dict?.id ?? null]}
      initialValues={dict ? { ...dict, description: dict.description ?? '' } : undefined}
      submitter={{ searchConfig: { submitText: dict ? '保存' : '创建' } }}
      onFinish={async values => {
        if (dict) await updateDict(dict.id, values)
        else await createDict(values)
        toast.add({ title: dict ? '修改成功' : '新增成功', type: 'success' })
        void queryClient.invalidateQueries({ queryKey: dictKeys.lists() })
        return true
      }}
    />
  )
}
