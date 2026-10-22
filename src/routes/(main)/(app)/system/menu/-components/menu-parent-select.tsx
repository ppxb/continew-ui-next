import * as React from 'react'

import { FileText, Folder } from 'lucide-react'

import { TreeSelect } from '@/components/ui/tree-select'
import type { TreeKey, TreeNodeData } from '@/components/ui/tree'
import type { MenuResp } from '@/lib/api/menu'
import { resolveMenuIcon } from '@/navigation/menu-icons'

/** Recursively collects the target ID and all its descendant IDs to prevent cyclic parenting. */
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

/** Transforms menu tree nodes into generic TreeNodeData for TreeSelect. */
function toMenuTreeNodeData(nodes: MenuResp[], disabledIds: Set<string>): TreeNodeData<MenuResp>[] {
  const result: TreeNodeData<MenuResp>[] = []

  for (const node of nodes) {
    // Buttons (type 3) cannot have child menus
    if (node.type === 3) continue

    const idStr = String(node.id)
    const isDisabled = disabledIds.has(idStr)
    const iconComponent = node.icon ? resolveMenuIcon(node.icon) : node.type === 1 ? Folder : FileText

    result.push({
      id: idStr,
      parentId: node.parentId ? String(node.parentId) : null,
      label: node.title,
      icon: iconComponent,
      disabled: isDisabled,
      data: node,
      children: node.children && node.children.length > 0 ? toMenuTreeNodeData(node.children, disabledIds) : undefined
    })
  }

  return result
}

interface MenuParentSelectProps {
  readonly value?: string | number | null
  readonly onChange: (value: string | number | null) => void
  readonly menuTree: MenuResp[]
  readonly currentMenuId?: string | number | null
  readonly disabled?: boolean
  readonly invalid?: boolean
}

export function MenuParentSelect({
  value,
  onChange,
  menuTree,
  currentMenuId,
  disabled,
  invalid
}: MenuParentSelectProps) {
  const disabledIds = React.useMemo(() => {
    if (!currentMenuId) return new Set<string>()
    return collectDescendantIds(menuTree, currentMenuId)
  }, [menuTree, currentMenuId])

  const treeData = React.useMemo(() => {
    return toMenuTreeNodeData(menuTree, disabledIds)
  }, [menuTree, disabledIds])

  const selectedValue = value !== null && value !== undefined && value !== '' ? String(value) : null

  const handleChange = (nextKey: TreeKey | null) => {
    if (nextKey === null || nextKey === '') {
      onChange(null)
    } else {
      // Preserve numeric ID if original ID was a number
      const num = Number(nextKey)
      onChange(Number.isNaN(num) ? nextKey : num)
    }
  }

  return (
    <TreeSelect
      data={treeData}
      value={selectedValue}
      onChange={handleChange}
      disabled={disabled}
      invalid={invalid}
      placeholder="选择上级菜单（默认根目录）"
      searchPlaceholder="搜索上级菜单"
      emptyText="未找到相关菜单"
      clearable
      searchable
      showExpandActions
      showIcons
      showAllOption
      allOptionLabel="根目录"
      className="w-full"
    />
  )
}
