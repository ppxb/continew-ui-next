import * as React from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { ChevronRight, Cloud, HardDrive } from 'lucide-react'

import { BetaSchemaForm } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { FieldGroup } from '@/components/ui/field'
import { toast } from '@/components/ui/toast'
import {
  createStorage,
  getStorage,
  type StorageType,
  updateStorage
} from '@/lib/api/storage'
import { encryptByRsa } from '@/lib/crypto'
import { storageKeys } from '@/lib/query-keys'

import { getStorageSecret, localStorageColumns, ossStorageColumns, type StorageRecord, toStorageReq } from './columns'
import { storageTypeLabel } from './display'

interface StorageFormDrawerProps {
  /**
   * The storage being edited, or `null` to create one.
   *
   * Unlike the delete dialog, `null` cannot mean "nothing picked yet": a create has to be able to
   * open the drawer, so `open` carries that state instead.
   */
  readonly storageId: string | number | null
  /** The type a create starts from, chosen by the toolbar. An edit reads it from the detail. */
  readonly storageType: StorageType
  readonly open: boolean
  readonly onClose: () => void
}

/** Storage field definitions also drive the grouped tables; the drawer only owns persistence. */
export function StorageFormDrawer({ storageId, storageType, open, onClose }: StorageFormDrawerProps) {
  const queryClient = useQueryClient()
  const isEdit = storageId !== null
  const [advancedOpen, setAdvancedOpen] = React.useState(false)
  const [loadedType, setLoadedType] = React.useState<{ id: string | number; type: StorageType } | null>(null)
  const activeType = loadedType?.id === storageId ? loadedType.type : storageType
  const isOss = activeType === 2
  const columns = React.useMemo(
    () => (isOss ? ossStorageColumns : localStorageColumns)({ isEdit }),
    [isOss, isEdit]
  )

  React.useEffect(() => {
    if (open && storageId === null) setAdvancedOpen(false)
  }, [open, storageId, storageType])

  return (
    <BetaSchemaForm<StorageRecord>
      layoutType="DrawerForm"
      title={`${isEdit ? '修改' : '新增'}${storageTypeLabel(activeType)}`}
      drawerProps={{ icon: isOss ? <Cloud className="size-4" /> : <HardDrive className="size-4" /> }}
      width={36}
      grid
      open={open}
      onOpenChange={next => { if (!next) onClose() }}
      columns={columns}
      queryKey={storageId === null ? [...storageKeys.detail(null), storageType] : storageKeys.detail(storageId)}
      request={storageId === null ? undefined : async (_params, signal) => {
        const storage = await getStorage(storageId, signal)
        setLoadedType({ id: storageId, type: storage.type })
        setAdvancedOpen(Boolean(storage.multipartUploadThreshold || storage.multipartUploadPartSize || storage.multipartTempDir))
        return storage
      }}
      formItemsRender={items => {
        const advanced = items.filter(item => item.name === 'multipartUploadThreshold' || item.name === 'multipartUploadPartSize' || item.name === 'multipartTempDir')
        const standard = items.filter(item => !advanced.includes(item))
        return <>
          {standard.map(item => item.dom)}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="sm:col-span-2">
            <CollapsibleTrigger render={<Button type="button" variant="ghost" className="group justify-start gap-1" />}>
              <ChevronRight className="transition-transform group-data-panel-open:rotate-90" />
              高级配置
            </CollapsibleTrigger>
            <CollapsibleContent>
              <FieldGroup className="grid gap-4 pt-2 sm:grid-cols-2">{advanced.map(item => item.dom)}</FieldGroup>
            </CollapsibleContent>
          </Collapsible>
        </>
      }}
      onFinish={async values => {
        const payload = toStorageReq(values, activeType)
        const secretKey = getStorageSecret(values)
        if (isOss && secretKey) {
          try {
            payload.secretKey = encryptByRsa(secretKey)
          } catch {
            toast.add({ title: 'Secret Key 加密失败，请刷新页面后重试', type: 'error' })
            return false
          }
        }
        try {
          if (storageId === null) await createStorage(payload)
          else await updateStorage(storageId, payload)
        } catch {
          // The HTTP layer has already reported the request failure.
          return false
        }
        void queryClient.invalidateQueries({ queryKey: storageKeys.all })
        toast.add({ title: isEdit ? '修改成功' : '新增成功', type: 'success' })
        return true
      }}
    />
  )
}
