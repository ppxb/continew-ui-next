import * as React from 'react'

import { Download, Plus } from 'lucide-react'

import { ProTable, type ProFormInstance } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useExport } from '@/hooks/use-export'
import { usePermission } from '@/hooks/use-permission'
import { appKeys, type AppPageQuery, type AppResp, exportApps, listApps } from '@/lib/api/app'

import { type AppAction, createAppColumns } from './app-columns'
import { AppDeleteDialog } from './app-delete-dialog'
import { AppDetailDrawer } from './app-detail-drawer'
import { AppFormDrawer } from './app-form-drawer'
import { AppResetSecretDialog } from './app-reset-secret-dialog'
import { AppSecretDialog } from './app-secret-dialog'

const HIDDEN_BY_DEFAULT = {
  createUserString: { show: false },
  updateUserString: { show: false },
  updateTime: { show: false }
}

const DEFAULT_SORT = 'id,desc'

export function AppList() {
  const { hasPermission } = usePermission()
  const canCreate = hasPermission('open:app:create')
  const canExport = hasPermission('open:app:export')
  const canGet = hasPermission('open:app:get')
  const canUpdate = hasPermission('open:app:update')
  const canSecret = hasPermission('open:app:secret')
  const canResetSecret = hasPermission('open:app:resetSecret')
  const canDelete = hasPermission('open:app:delete')
  const formRef = React.useRef<ProFormInstance<Omit<AppPageQuery, 'page' | 'size'>>>(undefined)
  // One state per overlay: a null value means it is closed, so "which record" and "is it open" can
  // never drift apart. The form drawer holds an object, because a null id there means 新增.
  const [detailAppId, setDetailAppId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ appId: string | number | null } | null>(null)
  const [secretApp, setSecretApp] = React.useState<AppResp | null>(null)
  const [resetSecretApp, setResetSecretApp] = React.useState<AppResp | null>(null)
  const [deletingApp, setDeletingApp] = React.useState<AppResp | null>(null)
  const { isExporting, exportData } = useExport(exportApps)

  const handleRowAction = React.useCallback((action: AppAction, app: AppResp) => {
    if (action === 'detail') {
      setDetailAppId(app.id)
      return
    }

    if (action === 'edit') {
      setFormTarget({ appId: app.id })
      return
    }

    if (action === 'secret') {
      setSecretApp(app)
      return
    }

    if (action === 'resetSecret') {
      setResetSecretApp(app)
      return
    }

    setDeletingApp(app)
  }, [])

  const columns = React.useMemo(
    () => createAppColumns(handleRowAction, { canGet, canUpdate, canSecret, canResetSecret, canDelete }),
    [handleRowAction, canGet, canUpdate, canSecret, canResetSecret, canDelete]
  )

  return (
    <>
      <ProTable<AppResp, Omit<AppPageQuery, 'page' | 'size'>>
        headerTitle="应用管理"
        toolbar={{ subTitle: '维护第三方接入应用及其访问凭证' }}
        rowKey="id"
        columns={columns}
        queryKey={appKeys.lists()}
        formRef={formRef}
        options={{ search: { name: 'description', placeholder: '搜索应用名称、描述' } }}
        columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
        request={async ({ current, pageSize, ...search }, _sort, _filter, signal) => {
          const page = await listApps({ ...search, page: current, size: pageSize, sort: DEFAULT_SORT }, signal)
          return { data: page.list, total: page.total }
        }}
        toolBarRender={() => [
          canCreate && (
            <Button key="create" className="w-full sm:w-auto" onClick={() => setFormTarget({ appId: null })}>
              <Plus />新增应用
            </Button>
          ),
          canExport && (
            <Button key="export" variant="outline" disabled={isExporting} onClick={() => void exportData({ ...formRef.current?.getFieldsFormatValue(), sort: DEFAULT_SORT })}>
              {isExporting ? <Spinner /> : <Download />}导出
            </Button>
          )
        ]}
      />

      <AppDetailDrawer appId={detailAppId} open={detailAppId !== null} onClose={() => setDetailAppId(null)} />
      <AppFormDrawer appId={formTarget?.appId ?? null} open={formTarget !== null} onClose={() => setFormTarget(null)} />
      <AppSecretDialog app={secretApp} open={secretApp !== null} onClose={() => setSecretApp(null)} />
      <AppResetSecretDialog
        app={resetSecretApp}
        open={resetSecretApp !== null}
        onClose={() => setResetSecretApp(null)}
        // Showing the new secret needs the read permission too.
        onSuccess={canSecret ? setSecretApp : undefined}
      />
      <AppDeleteDialog app={deletingApp} open={deletingApp !== null} onClose={() => setDeletingApp(null)} />
    </>
  )
}
