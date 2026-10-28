import * as React from 'react'

import type { TreeKey } from '@/components/ui/tree'
import { TreeSelect } from '@/components/ui/tree-select'
import type { DeptResp } from '@/lib/api/dept'
import { toDeptNodeData } from '@/lib/dept-tree'

/** Collects the target node and its descendants, so a department can never become its own child. */
function collectSubtreeIds(nodes: DeptResp[], targetId: string | number): Set<string> {
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
    return collectSubtreeIds(deptTree, currentDeptId)
  }, [deptTree, currentDeptId])

  const treeData = React.useMemo(() => {
    return toDeptNodeData(deptTree, disabledIds)
  }, [deptTree, disabledIds])

  const selectedValue = value !== null && value !== undefined && value !== '' ? String(value) : null

  const handleChange = (nextKey: TreeKey | null) => {
    if (nextKey === null || nextKey === '') {
      onChange(null)
      return
    }

    // Tree keys are strings; keep numeric department IDs numeric for the API.
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
