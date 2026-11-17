import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { RowActionsMenu } from '@/components/row-actions-menu'
import type { ReactNode } from 'react'

export type TableDropdownItem<K extends string> =
  | { key: K; name: ReactNode; icon?: ReactNode; disabled?: boolean; danger?: boolean }
  | { type: 'divider' }

export interface TableDropdownProps<K extends string> {
  menus: readonly (TableDropdownItem<K> | false | null | undefined)[]
  onSelect: (key: K) => void
}

export function TableDropdown<K extends string>({ menus, onSelect }: TableDropdownProps<K>) {
  const items: TableDropdownItem<K>[] = []
  for (const item of menus) {
    if (!item) continue
    if ('type' in item && (!items.length || 'type' in items[items.length - 1]!)) continue
    items.push(item)
  }
  if (items.length && 'type' in items[items.length - 1]!) items.pop()
  if (!items.length) return null

  return (
    <RowActionsMenu>
      <DropdownMenuGroup>
        {items.map((item, index) => 'type' in item ? (
          <DropdownMenuSeparator key={`divider-${index}`} />
        ) : (
          <DropdownMenuItem
            key={item.key}
            disabled={item.disabled}
            variant={item.danger ? 'destructive' : 'default'}
            onClick={() => onSelect(item.key)}
          >
            {item.icon}
            {item.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </RowActionsMenu>
  )
}
