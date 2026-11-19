import * as React from 'react'

import { BetaSchemaForm, type ProFormInstance } from '@/components/pro'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useLogout } from '@/hooks/use-logout'
import { updatePassword } from '@/lib/api/profile'
import { encryptByRsa } from '@/lib/crypto'

import { passwordColumns, type PasswordFormValues } from './password-columns'

const EMPTY_FORM: PasswordFormValues = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
}

export function PasswordForm() {
  const endSession = useLogout()
  const formRef = React.useRef<ProFormInstance>(undefined)

  return (
    <BetaSchemaForm<PasswordFormValues, typeof passwordColumns>
      layoutType="Form"
      columns={passwordColumns}
      initialValues={{ ...EMPTY_FORM }}
      formRef={formRef}
      onFinish={async value => {
        let oldPassword: string
        let newPassword: string
        try {
          oldPassword = encryptByRsa(value.oldPassword)
          newPassword = encryptByRsa(value.newPassword)
        } catch {
          // Encryption fails locally, before the HTTP layer can report the error.
          toast.add({ title: '密码加密失败，请刷新页面后重试', type: 'error' })
          return false
        }
        try {
          await updatePassword({ oldPassword, newPassword })
        } catch (error) {
          // This silent request is reported only by the password form.
          toast.add({ title: error instanceof Error ? error.message : '密码修改失败，请重试', type: 'error' })
          return false
        }
        formRef.current?.resetFields()
        toast.add({ title: '密码已修改，请使用新密码重新登录', type: 'success' })
        // The backend ends every device session after a successful password change.
        await endSession({ revokeOnServer: false })
        return true
      }}
      submitter={{
        render: ({ isSubmitting }) => (
          <Button className="self-start" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '修改中…' : '修改密码'}
          </Button>
        )
      }}
    />
  )
}
