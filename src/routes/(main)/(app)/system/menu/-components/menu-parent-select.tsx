import * as React from 'react'

import { FileText, Folder } from 'lucide-react'

import { TreeSelect } from '@/components/ui/tree-select'
import type { TreeKey, TreeNodeData } from '@/components/ui/tree'
import type { MenuResp } from '@/lib/api/menu'
import { resolveMenuIcon } from '@/navigation/menu-icons'

/** Collects the target node and its descendants, so a menu can never become its own child. */
function collectSubtreeIds(nodes: MenuResp[], targetId: string | number): Set<string> {
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
  // Buttons (type 3) cannot have child menus
  return nodes
    .filter(node => node.type !== 3)
    .map(node => ({
      id: String(node.id),
      parentId: node.parentId ? String(node.parentId) : null,
      label: node.title,
      icon: node.icon ? resolveMenuIcon(node.icon) : node.type === 1 ? Folder : FileText,
      disabled: disabledIds.has(String(node.id)),
      data: node,
      children: node.children?.length ? toMenuTreeNodeData(node.children, disabledIds) : undefined
    }))
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
    return collectSubtreeIds(menuTree, currentMenuId)
  }, [menuTree, currentMenuId])

  const treeData = React.useMemo(() => {
    return toMenuTreeNodeData(menuTree, disabledIds)
  }, [menuTree, disabledIds])

  const selectedValue = value !== null && value !== undefined && value !== '' ? String(value) : null

  const handleChange = (nextKey: TreeKey | null) => {
    if (nextKey === null || nextKey === '') {
      onChange(null)
      return
    }

    // Tree keys are strings; keep numeric menu IDs numeric for the API.
    const numeric = Number(nextKey)
    onChange(Number.isNaN(numeric) ? nextKey : numeric)
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
