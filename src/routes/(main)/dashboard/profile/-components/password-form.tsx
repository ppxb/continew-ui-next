import * as React from 'react'

import { revalidateLogic, useForm, useSelector } from '@tanstack/react-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { useLogout } from '@/hooks/use-logout'
import { updatePassword } from '@/lib/api/profile'
import { encryptPassword } from '@/lib/crypto'

/**
 * Mirrors the backend default policy (`RegexConstants.PASSWORD`): 8 to 32
 * characters with at least one letter and one digit. The backend remains the
 * authority, so its message is shown when a password is rejected.
 */
const formSchema = z
  .object({
    oldPassword: z.string().min(1, { message: 'Please enter your current password.' }),
    newPassword: z
      .string()
      .min(8, { message: 'The new password must be 8 to 32 characters long.' })
      .max(32, { message: 'The new password must be 8 to 32 characters long.' })
      .regex(/(?=.*\d)(?=.*[a-z])/, {
        message: 'The new password needs at least one letter and one digit.'
      }),
    confirmPassword: z.string().min(1, { message: 'Please repeat the new password.' })
  })
  .refine(values => values.newPassword === values.confirmPassword, {
    message: 'The two passwords do not match.',
    path: ['confirmPassword']
  })

type PasswordFormValues = z.infer<typeof formSchema>

const EMPTY_FORM: PasswordFormValues = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
}

export function PasswordForm() {
  const endSession = useLogout()
  const formRef = React.useRef<HTMLFormElement>(null)

  const form = useForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      let oldPassword: string
      let newPassword: string

      try {
        oldPassword = encryptPassword(value.oldPassword)
        newPassword = encryptPassword(value.newPassword)
      } catch {
        // Encryption happens locally, so the HTTP layer is not there to report it.
        toast.add({ title: 'Password encryption failed. Please refresh the page and try again.', type: 'error' })
        return
      }

      try {
        await updatePassword({ oldPassword, newPassword })
      } catch (error) {
        // `updatePassword` is a silent request, so this form is the only place that reports it.
        toast.add({
          title: error instanceof Error ? error.message : 'Could not update the password.',
          type: 'error'
        })
        return
      }

      form.reset({ ...EMPTY_FORM }, { keepDefaultValues: true })
      toast.add({ title: 'Password updated. Please sign in again with the new password.', type: 'success' })
      // The backend signs the account out of every device after a password change, so
      // the local session is dropped instead of waiting for the next 401.
      await endSession({ revokeOnServer: false })
    }
  })

  const isSubmitting = useSelector(form.store, state => state.isSubmitting)

  const submit = async () => {
    await form.validate('submit')
    await form.handleSubmit()

    // TanStack Form does not move focus to the first invalid control, so the form does it here.
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  return (
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
        <form.Field name="oldPassword" validators={{ onDynamic: formSchema.shape.oldPassword }}>
          {field => {
            const invalid = field.state.meta.errors.length > 0

            return (
              <Field className="gap-1.5" data-invalid={invalid}>
                <FieldLabel htmlFor="password-current">Current password</FieldLabel>
                <Input
                  id="password-current"
                  name="oldPassword"
                  type="password"
                  value={field.state.value}
                  onChange={event => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  aria-invalid={invalid}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="newPassword" validators={{ onDynamic: formSchema.shape.newPassword }}>
          {field => {
            const invalid = field.state.meta.errors.length > 0

            return (
              <Field className="gap-1.5" data-invalid={invalid}>
                <FieldLabel htmlFor="password-new">New password</FieldLabel>
                <Input
                  id="password-new"
                  name="newPassword"
                  type="password"
                  value={field.state.value}
                  onChange={event => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  aria-invalid={invalid}
                />
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
                <FieldLabel htmlFor="password-confirm">Repeat new password</FieldLabel>
                <Input
                  id="password-confirm"
                  name="confirmPassword"
                  type="password"
                  value={field.state.value}
                  onChange={event => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  aria-invalid={invalid}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )
          }}
        </form.Field>
      </FieldGroup>

      <Button className="self-start" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Update password'}
      </Button>
    </form>
  )
}
