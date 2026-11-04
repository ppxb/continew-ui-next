import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'

import { QueryState } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { dashboardKeys, getDashboardNotices } from '@/lib/api/dashboard'

const DASHBOARD_STALE_MS = 5 * 60_000

export function DashboardNotices() {
  const query = useQuery({
    queryKey: dashboardKeys.notices(),
    queryFn: ({ signal }) => getDashboardNotices(signal),
    staleTime: DASHBOARD_STALE_MS
  })

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>最新公告</CardTitle>
        <CardDescription>系统已发布的最新公告</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <QueryState state="error" className="h-60" onRetry={() => void query.refetch()} />
        ) : !query.data?.length ? (
          <QueryState state="empty" className="h-60" title="暂无公告" />
        ) : (
          <ul className="flex flex-col">
            {query.data.map(notice => (
              <li key={notice.id} className="flex items-start gap-2 border-b py-3 first:pt-0 last:border-b-0 last:pb-0">
                <Bell className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">{notice.title}</span>
                {notice.isTop ? (
                  <Badge variant="secondary" className="shrink-0">
                    置顶
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
