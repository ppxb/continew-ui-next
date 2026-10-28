import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ClassSchedule() {
  const today = format(new Date(), 'EEEE, d MMMM')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Class Schedule</CardTitle>
        <CardAction className="flex items-center gap-1 text-xs text-muted-foreground">
          View Full Schedule <ArrowRight className="size-4" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        <div className="flex flex-col divide-y divide-border">
          <div className="grid grid-cols-1 gap-3 bg-card py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
            <div className="flex gap-2">
              <div className="w-1 shrink-0 rounded-md bg-green-600 dark:bg-green-400" />
              <div className="text-xs text-nowrap">
                <div className="font-medium text-foreground">08:00 - 08:45</div>
                <div className="text-muted-foreground">{today}</div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <div className="truncate text-sm leading-none font-medium text-foreground">Pure Mathematics</div>
              <div className="truncate text-xs leading-none text-muted-foreground">Grade 11A • Room 2.14</div>
            </div>

            <Badge
              variant="secondary"
              className="shrink-0 rounded-md border-green-600/50 bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-600 dark:border-green-800/50 dark:bg-green-500/10 dark:text-green-400"
            >
              In Progress
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 bg-card py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
            <div className="flex gap-2">
              <div className="w-1 shrink-0 rounded-md bg-yellow-500 dark:bg-yellow-400" />
              <div className="text-xs text-nowrap">
                <div className="font-medium text-foreground">09:00 - 09:45</div>
                <div className="text-muted-foreground">{today}</div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <div className="truncate text-sm leading-none font-medium text-foreground">English Literature</div>
              <div className="truncate text-xs leading-none text-muted-foreground">Grade 11B • Seminar Room 3</div>
            </div>

            <Badge
              variant="secondary"
              className="shrink-0 rounded-md border-yellow-600/50 bg-yellow-50 px-2.5 py-1 text-[10px] font-medium text-yellow-700 dark:border-yellow-800/50 dark:bg-yellow-500/10 dark:text-yellow-300"
            >
              Upcoming
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 bg-card py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
            <div className="flex gap-2">
              <div className="w-1 shrink-0 rounded-md bg-yellow-500 dark:bg-yellow-400" />
              <div className="text-xs text-nowrap">
                <div className="font-medium text-foreground">10:00 - 10:45</div>
                <div className="text-muted-foreground">{today}</div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <div className="truncate text-sm leading-none font-medium text-foreground">Physics</div>
              <div className="truncate text-xs leading-none text-muted-foreground">Grade 11C • Physics Lab</div>
            </div>

            <Badge
              variant="secondary"
              className="shrink-0 rounded-md border-yellow-600/50 bg-yellow-50 px-2.5 py-1 text-[10px] font-medium text-yellow-700 dark:border-yellow-800/50 dark:bg-yellow-500/10 dark:text-yellow-300"
            >
              Upcoming
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 bg-card py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
            <div className="flex gap-2">
              <div className="w-1 shrink-0 rounded-md bg-destructive" />
              <div className="text-xs text-nowrap">
                <div className="font-medium text-foreground">11:00 - 11:45</div>
                <div className="text-muted-foreground">{today}</div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <div className="truncate text-sm leading-none font-medium text-foreground">Modern European History</div>
              <div className="truncate text-xs leading-none text-muted-foreground">Grade 11A • Room 1.08</div>
            </div>

            <Badge
              variant="secondary"
              className="shrink-0 rounded-md border-destructive/50 bg-destructive/10 px-2.5 py-1 text-[10px] font-medium text-destructive dark:border-destructive/50 dark:bg-destructive/20"
            >
              Cancelled
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 bg-card py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[10rem_1fr_auto] sm:items-center">
            <div className="flex gap-2">
              <div className="w-1 shrink-0 rounded-md bg-yellow-500 dark:bg-yellow-400" />
              <div className="text-xs text-nowrap">
                <div className="font-medium text-foreground">12:00 - 12:45</div>
                <div className="text-muted-foreground">{today}</div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <div className="truncate text-sm leading-none font-medium text-foreground">Computer Science</div>
              <div className="truncate text-xs leading-none text-muted-foreground">Grade 11B • Computing Lab</div>
            </div>

            <Badge
              variant="secondary"
              className="shrink-0 rounded-md border-yellow-600/50 bg-yellow-50 px-2.5 py-1 text-[10px] font-medium text-yellow-700 dark:border-yellow-800/50 dark:bg-yellow-500/10 dark:text-yellow-300"
            >
              Upcoming
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
