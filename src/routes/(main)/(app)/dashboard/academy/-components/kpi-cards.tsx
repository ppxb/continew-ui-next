import { ArrowUp, Info } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function KpiCards() {
  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Students Taught</CardTitle>
            <CardAction>
              <Info className="size-3 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-3xl leading-none tracking-tight text-foreground">128</span>
              <Badge className="rounded-sm border-green-600/50 bg-green-500/10 px-1 text-xs font-normal text-green-700 dark:border-green-800/50 dark:bg-green-500/15 dark:text-green-300">
                <ArrowUp />
                2.8%
              </Badge>
            </div>
            <div className="text-right text-xs text-muted-foreground">across 5 Grade 11 sections</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg. Attendance</CardTitle>
            <CardAction>
              <Info className="size-3 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-3xl leading-none tracking-tight text-foreground">94.2%</span>
              <Badge className="rounded-sm border-green-600/50 bg-green-500/10 px-1 text-xs font-normal text-green-700 dark:border-green-800/50 dark:bg-green-500/15 dark:text-green-300">
                <ArrowUp />
                1.1%
              </Badge>
            </div>
            <div className="text-right text-xs text-muted-foreground">vs last month</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Assignments</CardTitle>
            <CardAction>
              <Info className="size-3 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col">
            <div className="text-3xl leading-none tracking-tight text-foreground">81</div>

            <div className="text-right text-xs text-muted-foreground">63 pending · 18 overdue</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Classes Today</CardTitle>
            <CardAction>
              <Info className="size-3 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col">
            <div className="text-3xl leading-none tracking-tight text-foreground">5</div>

            <div className="text-right text-xs text-muted-foreground">1 in progress · 3 upcoming · 1 cancelled</div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
