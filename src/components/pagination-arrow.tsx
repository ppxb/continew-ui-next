import type { MouseEvent } from 'react'

import { PaginationNext, PaginationPrevious } from '@/components/ui/pagination'

interface PaginationArrowProps {
  readonly direction: 'previous' | 'next'
  readonly disabled: boolean
  readonly onClick: () => void
  readonly text?: string
}

/**
 * The previous/next arrow shared by the paginated lists. At either end the link keeps its slot,
 * but it leaves the tab order, reports `aria-disabled` and ignores activation.
 */
export function PaginationArrow({ direction, disabled, onClick, text = '' }: PaginationArrowProps) {
  const arrowProps = {
    href: '#',
    text,
    'aria-disabled': disabled || undefined,
    tabIndex: disabled ? -1 : undefined,
    className: disabled ? 'pointer-events-none opacity-50' : undefined,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      if (!disabled) {
        onClick()
      }
    }
  }

  return direction === 'previous' ? <PaginationPrevious {...arrowProps} /> : <PaginationNext {...arrowProps} />
}
