import * as React from 'react'

import { Folder, LayoutGrid } from 'lucide-react'

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { MenuResp } from '@/lib/api/menu'
import { resolveMenuIcon } from '@/navigation/sidebar/menu-icons'

interface MenuParentOption {
  id: string
  title: string
  depth: number
  icon: string | null
  type: number
  disabled?: boolean
}

/** Recursively flattens menus into selectable parent options, excluding buttons and self/descendants. */
function flattenMenuOptions(nodes: MenuResp[], disabledIds: Set<string>, depth = 0): MenuParentOption[] {
  const options: MenuParentOption[] = []

  for (const node of nodes) {
    // Buttons (type 3) cannot have child menus
    if (node.type === 3) continue

    const idStr = String(node.id)
    const isDisabled = disabledIds.has(idStr)

    options.push({
      id: idStr,
      title: node.title,
      depth,
      icon: node.icon,
      type: node.type,
      disabled: isDisabled
    })

    if (node.children && node.children.length > 0) {
      options.push(...flattenMenuOptions(node.children, disabledIds, depth + 1))
    }
  }

  return options
}

/** Collects the target ID and all its descendant IDs to prevent cyclic parent assignment. */
function collectDescendantIds(nodes: MenuResp[], targetId: string | number): Set<string> {
  const disabled = new Set<string>()
  const targetIdStr = String(targetId)

  function findAndMark(list: MenuResp[], foundParent = false) {
    for (const node of list) {
      const isTarget = String(node.id) === targetIdStr
      const shouldMark = foundParent || isTarget

      if (shouldMark) {
        disabled.add(String(node.id))
      }

      if (node.children && node.children.length > 0) {
        findAndMark(node.children, shouldMark)
      }
    }
  }

  findAndMark(nodes)
  return disabled
}

interface MenuParentSelectProps {
  readonly value?: string | number | null
  readonly onChange: (value: string | null) => void
  readonly menuTree: MenuResp[]
  readonly currentMenuId?: string | number | null
  readonly disabled?: boolean
}

export function MenuParentSelect({ value, onChange, menuTree, currentMenuId, disabled }: MenuParentSelectProps) {
  const disabledIds = React.useMemo(() => {
    if (!currentMenuId) return new Set<string>()
    return collectDescendantIds(menuTree, currentMenuId)
  }, [menuTree, currentMenuId])

  const options = React.useMemo(() => {
    return flattenMenuOptions(menuTree, disabledIds)
  }, [menuTree, disabledIds])

  const selectedValue = value ? String(value) : '0'

  return (
    <Select
      value={selectedValue}
      onValueChange={val => {
        onChange(val === '0' ? null : val)
      }}
      disabled={disabled}
    >
      <SelectTrigger className="h-9 w-full">
        <SelectValue placeholder="选择上级菜单" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectGroup>
          <SelectItem value="0">
            <div className="flex items-center gap-2 font-medium">
              <LayoutGrid className="size-3.5 text-muted-foreground" />
              <span>顶级目录（根节点）</span>
            </div>
          </SelectItem>
          {options.map(item => {
            const Icon = item.icon ? resolveMenuIcon(item.icon) : Folder
            const indentSpaces = '\u00A0\u00A0\u00A0\u00A0'.repeat(item.depth)

            return (
              <SelectItem key={item.id} value={item.id} disabled={item.disabled} className="font-mono text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span>
                    {indentSpaces}
                    {item.depth > 0 ? '└─ ' : ''}
                  </span>
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.title}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
