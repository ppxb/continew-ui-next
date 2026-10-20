import * as React from 'react'

import { KeyRound } from 'lucide-react'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { updateTenantAdminPassword, type TenantResp } from '@/lib/api/tenant'
import { encryptPassword } from '@/lib/crypto'

/** Mirrors `RegexConstants.PASSWORD`: 8 to 32 characters with at least one digit and one lowercase letter. */
const PASSWORD_PATTERN = /^(?=.*\d)(?=.*[a-z]).{8,32}$/
const PASSWORD_HINT = '密码长度为 8-32 个字符，且至少包含一个小写字母和一个数字'

interface TenantAdminPasswordDialogProps {
  /** The tenant whose administrator is being reset, or `null` before one is picked. */
  readonly tenant: TenantResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Resets a tenant administrator's password; the new one is RSA encrypted before it leaves. */
export function TenantAdminPasswordDialog({ tenant, open, onClose }: TenantAdminPasswordDialogProps) {
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // The parent clears `tenant` when the dialog closes, but the exit animation keeps rendering
  // this copy, so the name would vanish mid-close. `tenant` still wins while it is set.
  const [lastTenant, setLastTenant] = React.useState<TenantResp | null>(null)

  React.useEffect(() => {
    if (tenant) {
      setLastTenant(tenant)
    }
  }, [tenant])

  const shownTenant = tenant ?? lastTenant

  React.useEffect(() => {
    if (open) {
      setPassword('')
      setError(null)
    }
  }, [open])

  const submit = async () => {
    if (!tenant) {
      return
    }

    if (!PASSWORD_PATTERN.test(password)) {
      setError(PASSWORD_HINT)
      return
    }

    let encrypted: string
    try {
      encrypted = encryptPassword(password)
    } catch {
      toast.add({ title: '密码加密失败，请刷新页面后重试', type: 'error' })
      return
    }

    setIsSubmitting(true)

    try {
      await updateTenantAdminPassword(tenant.id, { password: encrypted })
      toast.add({ title: '修改成功', type: 'success' })
      onClose()
    } catch {
      // The HTTP layer already reported the failure.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && !isSubmitting) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4" />
            <DialogTitle>修改管理员密码</DialogTitle>
          </div>
          <DialogDescription>
            {shownTenant
              ? `为租户「${shownTenant.name}」的管理员「${shownTenant.adminUsername}」设置一个新密码`
              : '为该租户的管理员设置一个新密码'}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={event => {
            event.preventDefault()
            void submit()
          }}
        >
          <Field className="gap-1.5" data-invalid={Boolean(error)}>
            <FieldLabel>新密码</FieldLabel>
            <PasswordInput
              value={password}
              onChange={event => {
                setPassword(event.target.value)
                if (error) {
                  setError(null)
                }
              }}
              maxLength={32}
              placeholder="请输入新密码"
              autoComplete="new-password"
              aria-invalid={Boolean(error)}
            />
            {error ? <FieldError>{error}</FieldError> : <FieldDescription>{PASSWORD_HINT}</FieldDescription>}
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner />
                  保存中
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
