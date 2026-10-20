import * as React from 'react'

import { Check, Copy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const COPIED_FEEDBACK_MS = 1500

/** A value that is only useful next to a copy button, such as a generated id or code. */
export function CopyableText({ value }: { value: string | null | undefined }) {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  if (!value) {
    return null
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    } catch {
      // `navigator.clipboard` only exists in a secure context, so this can fail outright.
      toast.add({ title: '复制失败，请手动选择', type: 'error' })
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm">{value}</span>
      <Tooltip>
        <TooltipTrigger render={<Button type="button" variant="ghost" size="icon-xs" onClick={() => void copy()} />}>
          {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
        </TooltipTrigger>
        <TooltipContent side="top">{copied ? '已复制' : '复制'}</TooltipContent>
      </Tooltip>
    </div>
  )
}
