import { useMemo } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { Pen, User2 } from 'lucide-react'

import { BetaSchemaForm } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { MENU_QUERY_KEY } from '@/hooks/use-menu'
import { createUser, getUser, updateUser, userKeys } from '@/lib/api/user'
import { encryptByRsa } from '@/lib/crypto'

import { getUserFormColumns, type UserRecord } from './user-columns'
import { getUserPassword, toUserRequest } from './user-form-values'

interface UserFormDrawerProps {
  readonly userId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

export function UserFormDrawer({ userId, open, onClose }: UserFormDrawerProps) {
  const queryClient = useQueryClient()
  const isCreate = userId === null
  const columns = useMemo(() => getUserFormColumns(isCreate), [isCreate])

  return (
    <BetaSchemaForm<UserRecord>
      layoutType="DrawerForm"
      title={isCreate ? '新增用户' : '修改用户'}
      width={32}
      drawerProps={{ icon: isCreate ? <User2 className="size-4" /> : <Pen className="size-4" /> }}
      open={open}
      onOpenChange={next => {
        if (!next) onClose()
      }}
      columns={columns}
      queryKey={userKeys.detail(userId)}
      request={userId === null ? undefined : (_params, signal) => getUser(userId, signal)}
      onFinish={async values => {
        const body = toUserRequest(values)
        if (userId === null) {
          let password: string
          try {
            password = encryptByRsa(getUserPassword(values))
          } catch {
            toast.add({ title: '密码加密失败，请刷新页面后重试', type: 'error' })
            return false
          }
          try {
            await createUser({ ...body, password })
          } catch {
            return false
          }
        } else {
          try {
            await updateUser(userId, body)
          } catch {
            return false
          }
        }
        void queryClient.invalidateQueries({ queryKey: userKeys.all })
        void queryClient.invalidateQueries({ queryKey: MENU_QUERY_KEY })
        toast.add({ title: isCreate ? '新增成功' : '修改成功', type: 'success' })
        return true
      }}
    />
  )
}
