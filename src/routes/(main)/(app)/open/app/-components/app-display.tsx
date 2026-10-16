import * as React from 'react'

import { Check, Copy } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { AppResp } from '@/lib/api/app'

/** Stands in for a value the backend leaves empty. */
export const EMPTY_PLACEHOLDER = '—'

const COPIED_FEEDBACK_MS = 1500

export function appLabel(app: Pick<AppResp, 'name'>) {
  return app.name
}

export function StatusCell({ status }: { status?: AppResp['status'] | number | null }) {
  const isEnabled = status === 1

  return (
    <Badge variant="secondary">
      <span className={isEnabled ? 'size-1.5 rounded-full bg-green-600' : 'size-1.5 rounded-full bg-destructive'} />
      {isEnabled ? '启用' : '禁用'}
    </Badge>
  )
}

export function ExpireTimeCell({ expireTime }: { expireTime: string | null | undefined }) {
  if (!expireTime) {
    return <span className="text-sm text-muted-foreground">永久有效</span>
  }

  const isExpired = new Date(expireTime.replace(/-/g, '/')).getTime() < Date.now()

  if (isExpired) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-destructive tabular-nums">{expireTime}</span>
        <Badge variant="destructive" className="px-1.5 py-0 text-xs font-normal">
          已过期
        </Badge>
      </div>
    )
  }

  return <span className="text-sm tabular-nums">{expireTime}</span>
}

export function AccessKeyCell({ accessKey }: { accessKey: string }) {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async (event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(accessKey)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
      toast.add({ title: 'Access Key 已复制到剪贴板', type: 'success' })
    } catch {
      toast.add({ title: '复制失败，请手动复制', type: 'error' })
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="truncate text-sm" title={accessKey}>
        {accessKey}
      </span>
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon-sm" className="size-6 shrink-0" onClick={copy} />}>
          {copied ? <Check className="size-3 text-green-600" /> : <Copy className="size-3 text-muted-foreground" />}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {copied ? '已复制' : '复制 Access Key'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
