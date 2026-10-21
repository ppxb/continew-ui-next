import { createFileRoute, Outlet } from '@tanstack/react-router'

import { ThemeSwitcher } from '@/components/app-shell/header/theme-switcher'
import { Card, CardContent } from '@/components/ui/card'
import { FieldDescription } from '@/components/ui/field'
import { Ripple } from '@/components/ui/ripple'
import { useSiteOptions } from '@/hooks/use-site-options'

export const Route = createFileRoute('/(main)/auth')({
  component: AuthLayout
})

function AuthLayout() {
  const { title, logo, copyright, beian } = useSiteOptions()

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="mb-8 flex items-center justify-between md:justify-end">
          <div className="flex items-center gap-2 md:hidden">
            <img src={logo} alt={title} className="w-6 md:w-8" />
            <div className="font-bold md:text-lg">{title}</div>
          </div>
          <div className="flex gap-2">
            <ThemeSwitcher showTooltip={false} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="gap-0! overflow-hidden p-0!">
            <CardContent className="grid p-0! md:grid-cols-2">
              <Outlet />

              <div className="bg-background relative hidden justify-end md:flex">
                <div className="flex h-fit items-center gap-2 p-8">
                  <img src={logo} alt={title} className="w-6 md:w-8" />
                  <div className="font-bold md:text-lg">{title}</div>
                </div>
                <Ripple />
              </div>
            </CardContent>
          </Card>

          <FieldDescription className="px-6 text-center">
            {copyright}
            {beian ? <span className="ml-2 text-xs">{beian}</span> : null}
          </FieldDescription>
        </div>
      </div>
    </div>
  )
}
