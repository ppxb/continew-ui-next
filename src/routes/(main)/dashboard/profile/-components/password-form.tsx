import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
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

export function PasswordForm() {
  const endSession = useLogout()
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const onSubmit = async (values: PasswordFormValues) => {
    try {
      await updatePassword({
        oldPassword: encryptPassword(values.oldPassword),
        newPassword: encryptPassword(values.newPassword)
      })

      form.reset()
      toast.add({ title: 'Password updated. Please sign in again with the new password.', type: 'success' })
      // The backend signs the account out of every device after a password change, so
      // the local session is dropped instead of waiting for the next 401.
      await endSession({ revokeOnServer: false })
    } catch (error) {
      toast.add({
        title: error instanceof Error ? error.message : 'Could not update the password.',
        type: 'error'
      })
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="oldPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password-current">Current password</FieldLabel>
              <Input
                {...field}
                id="password-current"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password-new">New password</FieldLabel>
              <Input
                {...field}
                id="password-new"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password-confirm">Repeat new password</FieldLabel>
              <Input
                {...field}
                id="password-confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Button className="self-start" type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving…' : 'Update password'}
      </Button>
    </form>
  )
}
