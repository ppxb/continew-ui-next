import * as React from 'react'

import { revalidateLogic, useForm, useSelector } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
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
import { encryptByRsa } from '@/lib/crypto'

import { userLabel } from './user-display'

/** Backend password policy; the profile form uses the same rule. */
const PASSWORD_PATTERN = /^(?=.*\d)(?=.*[a-z]).{8,32}$/
const PASSWORD_HINT = '密码长度为 8-32 个字符，且至少包含一个小写字母和一个数字'

const formSchema = z
  .object({
    newPassword: z.string().regex(PASSWORD_PATTERN, PASSWORD_HINT),
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

export function UserResetPasswordDialog({ user, open, onClose }: UserResetPasswordDialogProps) {
  const queryClient = useQueryClient()
  const [lastUser, setLastUser] = React.useState<UserResp | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)

  // Keep the last user during the close animation, matching the delete dialog.
  React.useEffect(() => {
    if (user) {
      setLastUser(user)
    }
  }, [user])

  const shownUser = user ?? lastUser
  const shownLabel = userLabel(shownUser)

  const form = useForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      if (user === null) {
        return
      }

      let newPassword: string
      try {
        newPassword = encryptByRsa(value.newPassword)
      } catch {
        // Encryption happens locally, so the HTTP layer is not there to report it.
        toast.add({ title: '密码加密失败，请刷新页面后重试', type: 'error' })
        return
      }

      try {
        await resetUserPassword(user.id, { newPassword })
      } catch {
        // The HTTP layer already reported the failure.
        return
      }

      onClose()
      // A reset moves `pwdResetTime`, which only the detail response carries, so that one
      // record is invalidated and the list is left alone.
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(user.id) })
      toast.add({ title: '密码重置成功', type: 'success' })
    }
  })

  const isSubmitting = useSelector(form.store, state => state.isSubmitting)

  // This component stays mounted while the dialog is closed, so every opening starts clean
  // rather than showing whatever was typed the last time.
  React.useEffect(() => {
    if (open) {
      form.reset({ ...EMPTY_FORM }, { keepDefaultValues: true })
    }
  }, [open, form])

  const submit = async () => {
    await form.validate('submit')
    await form.handleSubmit()

    // TanStack Form does not move focus to the first invalid control, so the dialog does it here.
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        // Closing mid-save would leave the request in flight with no way to report it.
        if (!nextOpen && !isSubmitting) {
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

        <form
          ref={formRef}
          noValidate
          className="flex flex-col gap-4"
          onSubmit={event => {
            event.preventDefault()
            void submit()
          }}
        >
          <FieldGroup className="gap-4">
            <form.Field name="newPassword" validators={{ onDynamic: formSchema.shape.newPassword }}>
              {field => {
                const invalid = field.state.meta.errors.length > 0

                return (
                  <Field className="gap-1.5" data-invalid={invalid}>
                    <FieldLabel htmlFor="user-password-new">新密码</FieldLabel>
                    <PasswordInput
                      id="user-password-new"
                      name="newPassword"
                      value={field.state.value}
                      onChange={event => field.handleChange(event.target.value)}
                      onBlur={field.handleBlur}
                      maxLength={32}
                      autoComplete="new-password"
                      placeholder="请输入新密码"
                      disabled={isSubmitting}
                      aria-invalid={invalid}
                    />
                    <FieldDescription>{PASSWORD_HINT}</FieldDescription>
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )
              }}
            </form.Field>

            <form.Field name="confirmPassword" validators={{ onDynamic: formSchema.shape.confirmPassword }}>
              {field => {
                const invalid = field.state.meta.errors.length > 0

                return (
                  <Field className="gap-1.5" data-invalid={invalid}>
                    <FieldLabel htmlFor="user-password-confirm">确认密码</FieldLabel>
                    <PasswordInput
                      id="user-password-confirm"
                      name="confirmPassword"
                      value={field.state.value}
                      onChange={event => field.handleChange(event.target.value)}
                      onBlur={field.handleBlur}
                      maxLength={32}
                      autoComplete="new-password"
                      placeholder="请再次输入新密码"
                      disabled={isSubmitting}
                      aria-invalid={invalid}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )
              }}
            </form.Field>
          </FieldGroup>

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
