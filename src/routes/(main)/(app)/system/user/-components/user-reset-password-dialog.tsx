import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { resetUserPassword, userKeys, type UserResp } from '@/lib/api/user'
import { encryptPassword } from '@/lib/crypto'

import { userLabel } from './user-display'

/**
 * Mirrors the backend default policy (`RegexConstants.PASSWORD`): 8 to 32 characters with at
 * least one digit and one lowercase letter. The profile password form enforces the same rule.
 */
const PASSWORD_PATTERN = /^(?=.*\d)(?=.*[a-z]).{8,32}$/

const formSchema = z
  .object({
    newPassword: z.string().regex(PASSWORD_PATTERN, '密码长度为 8-32 个字符，且至少包含一个小写字母和一个数字'),
    confirmPassword: z.string().min(1, '请再次输入新密码')
  })
  .refine(values => values.newPassword === values.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword']
  })

type FormValues = z.infer<typeof formSchema>

const EMPTY_FORM: FormValues = { newPassword: '', confirmPassword: '' }

interface UserResetPasswordDialogProps {
  /** The user whose password is being reset, or `null` before the first one is picked. */
  readonly user: UserResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Admin-side password reset for one user.
 *
 * The new password is RSA encrypted before it is sent, exactly like the login and profile
 * forms. The backend then signs that user out of every device, so the description says so
 * instead of letting the admin be surprised by it.
 */
export function UserResetPasswordDialog({ user, open, onClose }: UserResetPasswordDialogProps) {
  const queryClient = useQueryClient()
  const [lastUser, setLastUser] = React.useState<UserResp | null>(null)

  // Keep the last user during the close animation, matching the delete dialog.
  React.useEffect(() => {
    if (user) {
      setLastUser(user)
    }
  }, [user])

  const shownUser = user ?? lastUser
  const shownLabel = userLabel(shownUser)

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: EMPTY_FORM })

  // This component stays mounted while the dialog is closed, so every opening starts clean
  // rather than showing whatever was typed the last time.
  React.useEffect(() => {
    if (open) {
      form.reset({ ...EMPTY_FORM })
    }
  }, [open, form])

  const onSubmit = async (values: FormValues) => {
    if (user === null) {
      return
    }

    let newPassword: string
    try {
      newPassword = encryptPassword(values.newPassword)
    } catch {
      // Encryption happens locally, so the HTTP layer is not there to report it.
      toast.add({ title: '密码加密失败，请刷新页面后重试', type: 'error' })
      return
    }

    try {
      await resetUserPassword(user.id, { newPassword })

      onClose()
      // A reset moves `pwdResetTime`, which only the detail response carries, so that one
      // record is invalidated and the list is left alone.
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(user.id) })
      toast.add({ title: `密码重置成功`, type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        // Closing mid-save would leave the request in flight with no way to report it.
        if (!nextOpen && !form.formState.isSubmitting) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4" />
            <DialogTitle>重置密码</DialogTitle>
          </div>
          <DialogDescription>
            {shownUser ? `为用户「${shownLabel}」设置新的登录密码` : '为该用户设置新的登录密码'}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="newPassword"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="user-password-new">新密码</FieldLabel>
                  <PasswordInput
                    {...field}
                    id="user-password-new"
                    maxLength={32}
                    autoComplete="new-password"
                    placeholder="请输入新密码"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>8-32 个字符，至少包含一个字母和一个数字</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="user-password-confirm">确认密码</FieldLabel>
                  <PasswordInput
                    {...field}
                    id="user-password-confirm"
                    maxLength={32}
                    autoComplete="new-password"
                    placeholder="请再次输入新密码"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
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
