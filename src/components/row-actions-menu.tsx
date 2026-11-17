import type { ComponentProps, ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type RowActionsMenuProps = {
  primary?: ReactNode
  showMenu?: boolean
  /** The menu body: DropdownMenuGroup / DropdownMenuItem / DropdownMenuSeparator. */
  children: ReactNode
  align?: ComponentProps<typeof DropdownMenuContent>['align']
  contentClassName?: string
  triggerVariant?: ComponentProps<typeof Button>['variant']
  triggerSize?: ComponentProps<typeof Button>['size']
}

/**
 * The ellipsis trigger and popup shell shared by the table row action menus.
 * The items stay at the call site because they depend on row state and permissions.
 */
export function RowActionsMenu({
  primary,
  showMenu = true,
  children,
  align = 'end',
  contentClassName = 'w-36',
  triggerVariant = 'ghost',
  triggerSize = 'icon-sm'
}: RowActionsMenuProps) {
  const menu = showMenu ? (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant={triggerVariant} size={triggerSize} aria-label="更多操作" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={contentClassName}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null
  return primary ? <div className="inline-flex items-center gap-1">{primary}{menu}</div> : menu
}
