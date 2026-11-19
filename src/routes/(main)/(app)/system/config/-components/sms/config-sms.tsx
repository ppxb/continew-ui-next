import * as React from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Plus, RefreshCw } from 'lucide-react'

import { ProTable, type ProFormInstance } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { usePermission } from '@/hooks/use-permission'
import { listSmsConfig, setDefaultSmsConfig, type SmsConfigResp } from '@/lib/api/sms'
import { reportError } from '@/lib/http'
import { smsKeys } from '@/lib/query-keys'

import { type DictOption, useDictOptions } from '../use-dict-options'
import { createSmsColumns, type SmsAction } from './columns'
import { SmsDeleteDialog } from './delete-dialog'
import { SmsFormDrawer } from './form-drawer'

const SUPPLIER_PRESETS: DictOption[] = [
  { label: '阿里云', value: 'alibaba' },
  { label: '腾讯云', value: 'tencent' },
  { label: '华为云', value: 'huawei' },
  { label: '容联云', value: 'cloopen' },
  { label: '网易云信', value: 'netease' },
  { label: '亿美软通', value: 'emay' },
  { label: '助通科技', value: 'zhutong' },
  { label: '鼎佑科技', value: 'dingyou' },
  { label: '联麓信息', value: 'lianlu' },
  { label: '螺丝帽', value: 'luosimao' }
]

const HIDDEN_BY_DEFAULT = {
  updateTime: { show: false },
  createTime: { show: false }
}

export function ConfigSms() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()
  const formRef = React.useRef<ProFormInstance<{ name?: string; supplier?: string }>>(undefined)
  const [keyword, setKeyword] = React.useState('')
  const [supplier, setSupplier] = React.useState<string | undefined>(undefined)

  // One state per overlay: a null value means it is closed. The form drawer holds an object, because
  // a null id there means 新增.
  const [formTarget, setFormTarget] = React.useState<{ smsId: string | number | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<SmsConfigResp | null>(null)

  const supplierOptions = useDictOptions('sms_supplier', SUPPLIER_PRESETS)

  const setDefaultMutation = useMutation({
    mutationFn: (id: string | number) => setDefaultSmsConfig(id),
    onSuccess: () => {
      toast.add({ title: '设置默认成功', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: smsKeys.all })
    },
    onError: err => reportError(err, '设置失败')
  })

  const handleRowAction = React.useCallback(
    (action: SmsAction, record: SmsConfigResp) => {
      if (action === 'edit') {
        setFormTarget({ smsId: record.id })
        return
      }

      if (action === 'setDefault') {
        setDefaultMutation.mutate(record.id)
        return
      }

      setDeleteTarget(record)
    },
    [setDefaultMutation]
  )

  const columns = React.useMemo(
    () =>
      createSmsColumns({
        supplierOptions,
        onSupplierChange: setSupplier,
        onAction: handleRowAction
      }),
    [supplierOptions, handleRowAction]
  )

  const handleResetFilters = () => {
    formRef.current?.resetFields()
    setKeyword('')
    setSupplier(undefined)
  }

  return (
    <>
      <ProTable<SmsConfigResp, { name?: string; supplier?: string }>
        cardProps={false}
        headerTitle="短信配置"
        toolbar={{ subTitle: '维护短信服务厂商的接入凭据与默认发送通道' }}
        columns={columns}
        rowKey="id"
        queryKey={smsKeys.lists()}
        formRef={formRef}
        columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
        options={{
          search: {
            name: 'name',
            placeholder: '搜索配置名称',
            onSearch: next => {
              setKeyword(next)
            }
          }
        }}
        request={async ({ current, pageSize, name, supplier: selectedSupplier }, _sort, _filter, signal) => {
          const result = await listSmsConfig(
            { page: current, size: pageSize, name: name || undefined, supplier: selectedSupplier },
            signal
          )
          return { data: result.list, total: result.total, success: true }
        }}
        toolBarRender={() => [
          ...(keyword !== '' || supplier !== undefined
            ? [
                <Button key="reset" type="button" variant="ghost" onClick={handleResetFilters}>
                  <RefreshCw />
                  重置
                </Button>
              ]
            : []),
          ...(hasPermission('system:smsConfig:create')
            ? [
                <Button key="create" className="w-full sm:w-auto" onClick={() => setFormTarget({ smsId: null })}>
                  <Plus />
                  新增配置
                </Button>
              ]
            : [])
        ]}
      />

      <SmsFormDrawer
        smsId={formTarget?.smsId ?? null}
        open={formTarget !== null}
        columns={columns}
        onClose={() => setFormTarget(null)}
      />
      <SmsDeleteDialog sms={deleteTarget} open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} />
    </>
  )
}
