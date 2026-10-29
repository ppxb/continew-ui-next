import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ClipboardList, LogIn } from 'lucide-react'
import { z } from 'zod'

import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { LogList } from './-components/log-list'

const searchSchema = z.object({
  tab: z.string().optional()
})

export const Route = createFileRoute('/(main)/(app)/monitor/log')({
  validateSearch: searchSchema,
  component: SystemLogPage
})

const TABS = [
  { mode: 'login', name: '登录日志', icon: <LogIn className="size-4" /> },
  { mode: 'operation', name: '操作日志', icon: <ClipboardList className="size-4" /> }
] as const

function SystemLogPage() {
  const { tab } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const activeTab = TABS.find(item => item.mode === tab)?.mode ?? 'login'

  const handleTabChange = (value: string) => {
    navigate({ search: previous => ({ ...previous, tab: value }) })
  }

  return (
    <div className="flex flex-col gap-4 pb-4" data-content-padding="false">
      <div className="px-4 pt-4 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight">系统日志</h1>
        <p className="mt-1 text-sm text-muted-foreground">查看登录日志与操作日志，支持按人员、IP、状态和时间范围筛选</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="min-h-0 flex-1 gap-0">
        <div className="touch-pan-x scrollbar-none overflow-x-auto overscroll-x-contain border-y">
          <TabsList
            variant="line"
            className="w-max min-w-full justify-start gap-4 px-4 *:data-[slot=tabs-trigger]:flex-none"
          >
            {TABS.map(({ mode, name, icon }) => (
              <TabsTrigger key={mode} value={mode} className="gap-2 after:hidden">
                {icon}
                {name}
              </TabsTrigger>
            ))}
            <TabsIndicator />
          </TabsList>
        </div>

        <div className="px-4 md:px-6">
          {TABS.map(({ mode }) => (
            <TabsContent key={mode} value={mode} className="py-4">
              <LogList mode={mode} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}
