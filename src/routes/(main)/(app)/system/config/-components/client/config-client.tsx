import * as React from 'react'

import { Plus } from 'lucide-react'

import { ProTable } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/use-permission'
import { listClient, type ClientResp } from '@/lib/api/client'
import { clientKeys } from '@/lib/query-keys'
import { type DictOption, useDictOptions } from '../use-dict-options'
import {
  AUTH_TYPE_OPTIONS,
  createClientColumns,
  LOGOUT_MODE_PRESETS,
  REPLACED_RANGE_PRESETS,
  type ClientAction
} from './columns'
import { ClientDeleteDialog } from './delete-dialog'
import { ClientDetailDrawer } from './detail-drawer'
import { ClientFormDrawer } from './form-drawer'

const CLIENT_TYPE_PRESETS: DictOption[] = [
  { label: 'PC网页端', value: 'PC' },
  { label: '移动App端', value: 'APP' },
  { label: '微信小程序', value: 'MINI' },
  { label: '三方Web服务', value: 'WEB' }
]

const HIDDEN_BY_DEFAULT = {
  refreshTokenTimeout: { show: false },
  refreshTokenMode: { show: false },
  replacedRange: { show: false },
  maxLoginCount: { show: false },
  overflowLogoutMode: { show: false },
  createUserString: { show: false },
  updateUserString: { show: false },
  updateTime: { show: false }
}

export function ConfigClient() {
  const { hasPermission } = usePermission()

  // One state per overlay: a null value means it is closed. The form drawer holds an object, because
  // a null id there means 新增.
  const [formTarget, setFormTarget] = React.useState<{ clientId: string | number | null } | null>(null)
  const [detailTarget, setDetailTarget] = React.useState<ClientResp | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ClientResp | null>(null)

  const clientTypeOptions = useDictOptions('client_type', CLIENT_TYPE_PRESETS)
  const authTypeOptions = useDictOptions('auth_type_enum', AUTH_TYPE_OPTIONS)
  const replacedRangeOptions = useDictOptions('replaced_range_enum', REPLACED_RANGE_PRESETS)
  const logoutModeOptions = useDictOptions('logout_mode_enum', LOGOUT_MODE_PRESETS)

  const handleRowAction = React.useCallback((action: ClientAction, record: ClientResp) => {
    if (action === 'detail') {
      setDetailTarget(record)
      return
    }

    if (action === 'edit') {
      setFormTarget({ clientId: record.id })
      return
    }

    setDeleteTarget(record)
  }, [])

  const columns = React.useMemo(
    () =>
      createClientColumns({
        clientTypeOptions,
        authTypeOptions,
        replacedRangeOptions,
        logoutModeOptions,
        onAction: handleRowAction
      }),
    [clientTypeOptions, authTypeOptions, replacedRangeOptions, logoutModeOptions, handleRowAction]
  )

  return (
    <>
      <ProTable<ClientResp, { clientType?: string; status?: number }>
        cardProps={false}
        headerTitle="客户端配置"
        toolbar={{ subTitle: '管理客户端凭据、令牌策略与登录限制' }}
        columns={columns}
        rowKey="id"
        queryKey={clientKeys.lists()}
        columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
        request={async ({ current, pageSize, clientType, status }, _sort, _filter, signal) => {
          const result = await listClient({ page: current, size: pageSize, clientType, status }, signal)
          return { data: result.list, total: result.total, success: true }
        }}
        toolBarRender={() =>
          hasPermission('system:client:create')
            ? [
                <Button key="create" className="w-full sm:w-auto" onClick={() => setFormTarget({ clientId: null })}>
                  <Plus />
                  新增客户端
                </Button>
              ]
            : []
        }
      />

      <ClientFormDrawer
        clientId={formTarget?.clientId ?? null}
        open={formTarget !== null}
        columns={columns}
        onClose={() => setFormTarget(null)}
      />
      <ClientDetailDrawer
        client={detailTarget}
        open={detailTarget !== null}
        columns={columns}
        onClose={() => setDetailTarget(null)}
      />
      <ClientDeleteDialog client={deleteTarget} open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} />
    </>
  )
}
