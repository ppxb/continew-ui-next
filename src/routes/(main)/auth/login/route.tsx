import { createFileRoute } from '@tanstack/react-router'

import { Globe } from 'lucide-react'

import { APP_CONFIG } from '@/config/app-config'

import { LoginForm } from '../-components/login-form'
import { GoogleButton } from '../-components/social-auth/google-button'

export const Route = createFileRoute('/(main)/auth/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined
  }),
  component: LoginPage
})

function LoginPage() {
  const { redirect } = Route.useSearch()

  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-87.5">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-medium">Login to your account</h1>
          <p className="text-sm text-muted-foreground">Please enter your details to login.</p>
        </div>
        <div className="space-y-4">
          <GoogleButton className="w-full" />
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
          <LoginForm redirectTo={redirect} />
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </div>
    </>
  )
}
