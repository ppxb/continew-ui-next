import { createFileRoute } from '@tanstack/react-router'

import { Globe } from 'lucide-react'

import { useSiteOptions } from '@/hooks/use-site-options'

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
  const { copyright, beian } = useSiteOptions()

  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-87.5">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-medium">登录您的账户</h1>
          <p className="text-sm text-muted-foreground">请输入您的详细信息以登录</p>
        </div>
        <div className="space-y-4">
          <GoogleButton className="w-full" />
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">或者继续使用</span>
          </div>
          <LoginForm redirectTo={redirect} />
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm">{copyright}</div>
          {beian ? <div className="text-xs text-muted-foreground">{beian}</div> : null}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </div>
    </>
  )
}
