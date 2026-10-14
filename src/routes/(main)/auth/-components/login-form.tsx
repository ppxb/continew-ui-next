import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useCaptcha } from '@/hooks/use-captcha'
import { useAuthStore } from '@/stores/auth/auth-provider'

import { CaptchaImage } from './captcha-image'

/** Where the user lands when no redirect target was remembered. */
const DEFAULT_REDIRECT = '/dashboard'

const formSchema = z.object({
  username: z.string().min(1, { message: 'Please enter your username.' }),
  password: z.string().min(1, { message: 'Please enter your password.' }),
  captcha: z.string().optional(),
  remember: z.boolean().optional()
})

type LoginFormValues = z.infer<typeof formSchema>

export function LoginForm({ redirectTo }: { readonly redirectTo?: string }) {
  const navigate = useNavigate()
  const login = useAuthStore(state => state.login)
  const { captcha, isEnabled: isCaptchaEnabled, isLoading: isCaptchaLoading, refresh: refreshCaptcha } = useCaptcha()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: 'admin',
      password: 'admin123',
      captcha: '',
      remember: true
    }
  })

  const onSubmit = async (values: LoginFormValues) => {
    if (isCaptchaEnabled && !values.captcha) {
      form.setError('captcha', { message: 'Please enter the captcha.' })
      return
    }

    try {
      await login({
        username: values.username,
        password: values.password,
        captcha: values.captcha || undefined,
        uuid: captcha?.uuid,
        persist: values.remember
      })

      // `href` keeps any query string that was part of the requested URL.
      await navigate({ href: redirectTo?.startsWith('/') ? redirectTo : DEFAULT_REDIRECT, replace: true })
    } catch (error) {
      // The backend already localizes this message; show it as it is.
      toast.add({
        title: error instanceof Error ? error.message : 'Login failed, please try again.',
        type: 'error'
      })
      form.setValue('captcha', '')
      void refreshCaptcha()
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-username">Username</FieldLabel>
              <Input
                {...field}
                id="login-username"
                type="text"
                placeholder="admin"
                autoComplete="username"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Input
                {...field}
                id="login-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {isCaptchaEnabled && (
          <Controller
            control={form.control}
            name="captcha"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="login-captcha">Captcha</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    {...field}
                    id="login-captcha"
                    type="text"
                    placeholder="Enter the code"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  <CaptchaImage
                    img={captcha?.img}
                    isEnabled={isCaptchaEnabled}
                    isLoading={isCaptchaLoading}
                    onRefresh={() => void refreshCaptcha()}
                  />
                </div>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}
        <Controller
          control={form.control}
          name="remember"
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <Checkbox
                id="login-remember"
                name={field.name}
                checked={field.value}
                onCheckedChange={checked => field.onChange(Boolean(checked))}
                aria-invalid={fieldState.invalid}
              />
              <FieldContent>
                <FieldLabel htmlFor="login-remember" className="font-normal">
                  Remember me
                </FieldLabel>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldContent>
            </Field>
          )}
        />
      </FieldGroup>
      <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? (
          <>
            <Spinner />
            Logging in
          </>
        ) : (
          'Login'
        )}
      </Button>
    </form>
  )
}
