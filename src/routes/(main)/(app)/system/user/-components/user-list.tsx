import * as React from 'react'

import { Download, Plus, Upload } from 'lucide-react'

import { ProTable, type ProFormInstance } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useExport } from '@/hooks/use-export'
import { usePermission } from '@/hooks/use-permission'
import { exportUsers, listUsers, userKeys, type UserPageQuery, type UserResp } from '@/lib/api/user'

import { UserAssignRolesDialog } from './user-assign-roles-dialog'
import { createUserColumns, type UserAction, type UserRecord } from './user-columns'
import { UserDeleteDialog } from './user-delete-dialog'
import { UserDetailDrawer } from './user-detail-drawer'
import { UserFormDrawer } from './user-form-drawer'
import { UserImportDrawer } from './user-import-drawer'
import { UserResetPasswordDialog } from './user-reset-password-dialog'

const HIDDEN_BY_DEFAULT = {
  isSystem: { show: false },
  createUserString: { show: false },
  updateUserString: { show: false },
  updateTime: { show: false }
}

/** The user query sorts on its own `t1` table alias. */
const DEFAULT_SORT = 't1.id,desc'

export function UserList() {
  const formRef = React.useRef<ProFormInstance<Omit<UserPageQuery, 'page' | 'size'>>>(undefined)
  const [detailUserId, setDetailUserId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ userId: string | number | null } | null>(null)
  const [resetUser, setResetUser] = React.useState<UserResp | null>(null)
  const [roleUser, setRoleUser] = React.useState<UserResp | null>(null)
  const [deletingUser, setDeletingUser] = React.useState<UserResp | null>(null)
  const [importOpen, setImportOpen] = React.useState(false)
  const { isExporting, exportData } = useExport(exportUsers)
  const { permissions, hasPermission } = usePermission()

  const handleRowAction = React.useCallback((action: UserAction, user: UserResp) => {
    if (action === 'detail') {
      setDetailUserId(user.id)
      return
    }
    if (action === 'edit') {
      setFormTarget({ userId: user.id })
      return
    }
    if (action === 'resetPassword') {
      setResetUser(user)
      return
    }
    if (action === 'assignRoles') {
      setRoleUser(user)
      return
    }
    setDeletingUser(user)
  }, [])

  const columns = React.useMemo(() => createUserColumns(handleRowAction, permissions), [handleRowAction, permissions])

  return (
    <>
      <ProTable<UserRecord, Omit<UserPageQuery, 'page' | 'size'>>
        headerTitle="用户管理"
        toolbar={{ subTitle: '对当前系统用户的基本信息进行管理' }}
        rowKey="id"
        columns={columns}
        queryKey={userKeys.lists()}
        disabledColumnKeys={['nickname']}
        formRef={formRef}
        options={{ search: { name: 'description', placeholder: '搜索用户名、昵称、描述' } }}
        columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
        request={async ({ current, pageSize, ...search }, _sort, _filter, signal) => {
          const page = await listUsers({ ...search, page: current, size: pageSize, sort: DEFAULT_SORT }, signal)
          return { data: page.list, total: page.total }
        }}
        toolBarRender={() => [
          ...(hasPermission('system:user:create')
            ? [
                <Button key="create" onClick={() => setFormTarget({ userId: null })}>
                  <Plus />
                  新增用户
                </Button>
              ]
            : []),
          ...(hasPermission('system:user:import')
            ? [
                <Button
                  key="import"
                  size="icon"
                  variant="outline"
                  aria-label="导入用户"
                  title="导入用户"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload />
                </Button>
              ]
            : []),
          ...(hasPermission('system:user:export')
            ? [
                <Button
                  key="export"
                  size="icon"
                  variant="outline"
                  disabled={isExporting}
                  onClick={() => void exportData({ ...formRef.current?.getFieldsFormatValue(), sort: DEFAULT_SORT })}
                >
                  {isExporting ? <Spinner /> : <Download />}
                </Button>
              ]
            : [])
        ]}
      />

      <UserDetailDrawer userId={detailUserId} open={detailUserId !== null} onClose={() => setDetailUserId(null)} />
      <UserFormDrawer
        userId={formTarget?.userId ?? null}
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
      />
      <UserResetPasswordDialog user={resetUser} open={resetUser !== null} onClose={() => setResetUser(null)} />
      <UserAssignRolesDialog user={roleUser} open={roleUser !== null} onClose={() => setRoleUser(null)} />
      <UserDeleteDialog user={deletingUser} open={deletingUser !== null} onClose={() => setDeletingUser(null)} />
      <UserImportDrawer open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  )
}
