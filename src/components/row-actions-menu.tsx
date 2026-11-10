import type { ComponentProps, ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type RowActionsMenuProps = {
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
  children,
  align = 'end',
  contentClassName = 'w-36',
  triggerVariant = 'ghost',
  triggerSize = 'icon-sm'
}: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant={triggerVariant} size={triggerSize} />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={contentClassName}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
