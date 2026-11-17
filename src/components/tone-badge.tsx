import type { ReactNode } from 'react'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

import { Badge } from '@/components/ui/badge'

const toneBadgeVariants = cva('gap-1.5 border px-2', {
  variants: {
    tone: {
      // Status tones: the result or state of a record.
      success: 'border-status-success/20 bg-status-success/10 text-status-success-foreground',
      warning: 'border-status-warning/20 bg-status-warning/10 text-status-warning-foreground',
      caution: 'border-status-caution/20 bg-status-caution/10 text-status-caution-foreground',
      danger: 'border-destructive/20 bg-destructive/10 text-destructive',
      info: 'border-status-info/20 bg-status-info/10 text-status-info-foreground',
      primary: 'border-primary/20 bg-primary/10 text-primary',
      neutral: 'border-border bg-muted/50 text-muted-foreground',
      // Type tones: a category with no good or bad meaning.
      blue: 'border-type-blue/20 bg-type-blue/10 text-type-blue-foreground',
      violet: 'border-type-violet/20 bg-type-violet/10 text-type-violet-foreground',
      teal: 'border-type-teal/20 bg-type-teal/10 text-type-teal-foreground',
      amber: 'border-type-amber/20 bg-type-amber/10 text-type-amber-foreground'
    },
    /** `status` is the denser row badge with a dot; `type` is the lighter category tag. */
    kind: {
      status: 'py-1 font-medium',
      type: 'py-0.5 font-normal'
    }
  },
  defaultVariants: {
    tone: 'neutral',
    kind: 'status'
  }
})

const dotVariants = cva('size-1.5 rounded-full', {
  variants: {
    tone: {
      success: 'bg-status-success',
      warning: 'bg-status-warning',
      caution: 'bg-status-caution',
      danger: 'bg-destructive',
      info: 'bg-status-info',
      primary: 'bg-primary',
      neutral: 'bg-muted-foreground',
      blue: 'bg-type-blue',
      violet: 'bg-type-violet',
      teal: 'bg-type-teal',
      amber: 'bg-type-amber'
    }
  },
  defaultVariants: {
    tone: 'neutral'
  }
})

export type BadgeTone = NonNullable<VariantProps<typeof toneBadgeVariants>['tone']>

interface ToneBadgeProps {
  readonly tone: BadgeTone
  readonly label: ReactNode
  readonly kind?: 'status' | 'type'
  /** Draws the leading dot; on by default for `status` badges. */
  readonly dot?: boolean
  readonly className?: string
}

/** One colored badge for every status and type label, so the tones stay in one table. */
export function ToneBadge({ tone, label, kind = 'status', dot = kind === 'status', className }: ToneBadgeProps) {
  return (
    <Badge variant="outline" className={cn(toneBadgeVariants({ tone, kind }), className)}>
      {dot ? <span className={dotVariants({ tone })} /> : null}
      {label}
    </Badge>
  )
}
