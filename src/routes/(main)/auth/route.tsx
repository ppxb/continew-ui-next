import { createFileRoute, Outlet } from '@tanstack/react-router'

import { Separator } from '@/components/ui/separator'
import { StripedPattern } from '@/components/ui/striped-pattern'
import { useSiteOptions } from '@/hooks/use-site-options'

export const Route = createFileRoute('/(main)/auth')({
  component: AuthLayout
})

function AuthLayout() {
  const { title, description, logo } = useSiteOptions()

  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="relative order-2 hidden h-full overflow-hidden rounded-3xl bg-primary lg:flex">
          <StripedPattern className="text-primary-foreground/20" />

          <div className="absolute top-10 z-20 space-y-3 px-10 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl">
                <img src={logo} alt={title} className="size-full object-contain" />
              </div>
              <h1 className="text-2xl font-medium">{title}</h1>
            </div>
            <p className="text-sm">{description}</p>
          </div>

          <div className="absolute bottom-10 z-20 flex w-full justify-between px-10">
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">开箱即用</h2>
              <p className="text-sm">
                用户、角色、菜单、部门、字典、文件、公告等基础能力已内置，接上后端即可开始业务开发。
              </p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto!" />
            <div className="flex-1 space-y-1 text-primary-foreground">
              <h2 className="font-medium">按需扩展</h2>
              <p className="text-sm">多租户、能力开放、任务调度与代码生成以插件形式提供，随业务需要逐步启用。</p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">
          <Outlet />
        </div>
      </div>
    </main>
  )
}
