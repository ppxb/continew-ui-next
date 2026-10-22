import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'

import { TreeSelect } from '@/components/ui/tree-select'
import type { TreeNodeData } from '@/components/ui/tree'
import { deptKeys, getDeptTree, type DeptTreeNode } from '@/lib/api/dept'

const LOOKUP_STALE_MS = 5 * 60_000
const EMPTY_NODES: DeptTreeNode[] = []

export interface DeptTreeSelectProps {
  readonly value?: string | number | null
  readonly onChange?: (nextValue: string) => void
  readonly disabled?: boolean
  readonly invalid?: boolean
  readonly placeholder?: string
  /** Controlled open flag to enable lazy querying when dialog or drawer opens. */
  readonly enabled?: boolean
  readonly className?: string
  readonly showPathInTrigger?: boolean
  /** Optional pre-fetched department tree data */
  readonly data?: DeptTreeNode[]
  /** Optional loading state if data is fetched externally */
  readonly loading?: boolean
  readonly size?: 'default' | 'sm'
  readonly triggerPrefix?: React.ReactNode
  readonly showAllOption?: boolean
  readonly allOptionLabel?: string
  readonly placeholderColor?: 'muted' | 'foreground'
}

/**
 * Transforms backend `DeptTreeNode`s into generic `TreeNodeData`s for `TreeSelect`.
 */
export function toDeptTreeNodeData(nodes: DeptTreeNode[]): TreeNodeData<DeptTreeNode>[] {
  return nodes.map(node => ({
    id: String(node.id),
    parentId: node.parentId ? String(node.parentId) : null,
    label: node.name,
    icon: Building2,
    children: node.children && node.children.length > 0 ? toDeptTreeNodeData(node.children) : undefined,
    data: node
  }))
}

/**
 * High-performance department tree select component for forms and filters.
 *
 * Automatically fetches and caches the department hierarchy using `deptKeys.trees()`,
 * provides instantaneous search, full path display, and single-click expand/collapse.
 */
export function DeptTreeSelect({
  value,
  onChange,
  disabled = false,
  invalid = false,
  placeholder = '请选择所属部门',
  enabled = true,
  className,
  showPathInTrigger = false,
  data: externalData,
  loading: externalLoading,
  size = 'default',
  triggerPrefix,
  showAllOption = false,
  allOptionLabel = '全部',
  placeholderColor = 'muted'
}: DeptTreeSelectProps) {
  const shouldQuery = externalData === undefined

  const depts = useQuery({
    queryKey: deptKeys.trees(),
    queryFn: ({ signal }) => getDeptTree(undefined, signal),
    staleTime: LOOKUP_STALE_MS,
    enabled: enabled && shouldQuery
  })

  const rawNodes = externalData ?? depts.data ?? EMPTY_NODES
  const isLoading = externalLoading ?? (shouldQuery && depts.isPending)
  const isError = shouldQuery && depts.isError

  const treeData = React.useMemo(() => {
    return toDeptTreeNodeData(rawNodes)
  }, [rawNodes])

  const selectedValue = value !== undefined && value !== null && value !== '' ? String(value) : null

  const handleChange = (nextKey: string | number | null) => {
    onChange?.(nextKey ? String(nextKey) : '')
  }

  return (
    <TreeSelect
      data={treeData}
      value={selectedValue}
      onChange={handleChange}
      loading={isLoading}
      disabled={disabled || isError}
      invalid={invalid}
      placeholder={isLoading ? '部门加载中' : isError ? '部门加载失败' : placeholder}
      searchPlaceholder="搜索部门"
      emptyText="未找到相关部门"
      clearable
      searchable
      showExpandActions
      showIcons
      showPathInTrigger={showPathInTrigger}
      className={className}
      size={size}
      triggerPrefix={triggerPrefix}
      showAllOption={showAllOption}
      allOptionLabel={allOptionLabel}
      placeholderColor={placeholderColor}
    />
  )
}
