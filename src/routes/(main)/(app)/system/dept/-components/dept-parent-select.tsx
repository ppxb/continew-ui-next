import * as React from 'react'

import { Building2 } from 'lucide-react'

import type { TreeKey, TreeNodeData } from '@/components/ui/tree'
import { TreeSelect } from '@/components/ui/tree-select'
import type { DeptResp } from '@/lib/api/dept'

/** Recursively collects the target ID and all its descendant IDs to prevent cyclic parenting. */
function collectDescendantIds(nodes: DeptResp[], targetId: string | number): Set<string> {
  const disabled = new Set<string>()
  const targetIdStr = String(targetId)

  function findAndMark(list: DeptResp[], foundParent = false) {
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

/** Transforms dept tree nodes into generic TreeNodeData for TreeSelect. */
function toDeptNodeData(nodes: DeptResp[], disabledIds: Set<string>): TreeNodeData<DeptResp>[] {
  const result: TreeNodeData<DeptResp>[] = []

  for (const node of nodes) {
    const idStr = String(node.id)
    const isDisabled = disabledIds.has(idStr)

    result.push({
      id: idStr,
      parentId: node.parentId ? String(node.parentId) : null,
      label: node.name,
      icon: Building2,
      disabled: isDisabled,
      data: node,
      children: node.children && node.children.length > 0 ? toDeptNodeData(node.children, disabledIds) : undefined
    })
  }

  return result
}

interface DeptParentSelectProps {
  readonly value?: string | number | null
  readonly onChange: (value: string | number | null) => void
  readonly deptTree: DeptResp[]
  readonly currentDeptId?: string | number | null
  readonly disabled?: boolean
  readonly invalid?: boolean
}

export function DeptParentSelect({
  value,
  onChange,
  deptTree,
  currentDeptId,
  disabled,
  invalid
}: DeptParentSelectProps) {
  const disabledIds = React.useMemo(() => {
    if (!currentDeptId) return new Set<string>()
    return collectDescendantIds(deptTree, currentDeptId)
  }, [deptTree, currentDeptId])

  const treeData = React.useMemo(() => {
    return toDeptNodeData(deptTree, disabledIds)
  }, [deptTree, disabledIds])

  const selectedValue = value !== null && value !== undefined && value !== '' ? String(value) : null

  const handleChange = (nextKey: TreeKey | null) => {
    if (nextKey === null || nextKey === '') {
      onChange(null)
    } else {
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
      placeholder="选择上级部门"
      searchPlaceholder="搜索上级部门"
      emptyText="未找到相关部门"
      clearable
      searchable
      showExpandActions
      showIcons
      className="w-full"
    />
  )
}
