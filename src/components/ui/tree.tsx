import * as React from 'react'
import { cn } from 'cn'
import { Check, ChevronRight, Folder, FolderOpen } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'

export type TreeKey = string | number

export interface TreeNodeData<T = Record<string, unknown>> {
  id: TreeKey
  parentId?: TreeKey | null
  label: string
  disabled?: boolean
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode
  tag?: React.ReactNode
  subtitle?: React.ReactNode
  searchTerms?: string
  children?: TreeNodeData<T>[]
  data?: T
}

export interface TreeRenderNodeProps<T = Record<string, unknown>> {
  node: TreeNodeData<T>
  depth: number
  isExpanded: boolean
  isSelected: boolean
  isChecked?: boolean
  isIndeterminate?: boolean
  hasChildren: boolean
  searchKeyword?: string
  toggleExpand: (e: React.MouseEvent) => void
  selectNode: () => void
  toggleCheck?: () => void
}

export interface TreeProps<T = Record<string, unknown>> {
  data: TreeNodeData<T>[]
  selectedKey?: TreeKey | null
  onSelect?: (key: TreeKey, node: TreeNodeData<T>) => void
  /** Enables multi-selection via checkboxes */
  checkable?: boolean
  checkedKeys?: TreeKey[]
  onCheckedChange?: (keys: TreeKey[]) => void
  /** If true, parent and child checkboxes are decoupled */
  checkStrictly?: boolean
  expandedKeys?: TreeKey[]
  defaultExpandedKeys?: TreeKey[]
  onExpandedKeysChange?: (keys: TreeKey[]) => void
  defaultExpandAll?: boolean
  searchKeyword?: string
  showIcons?: boolean
  selectableLeafOnly?: boolean
  renderLabel?: (props: TreeRenderNodeProps<T>) => React.ReactNode
  renderIcon?: (props: TreeRenderNodeProps<T>) => React.ReactNode
  renderAction?: (props: TreeRenderNodeProps<T>) => React.ReactNode
  emptyText?: React.ReactNode
  className?: string
  /** Indentation per depth level in rem, defaults to 1.125rem (responsive to 0.625rem on mobile) */
  indentRem?: number
}

export interface TreeIndex<T> {
  nodeMap: Map<TreeKey, TreeNodeData<T>>
  parentMap: Map<TreeKey, TreeKey | null>
  directChildrenMap: Map<TreeKey, TreeKey[]>
  descendantsMap: Map<TreeKey, TreeKey[]>
  ancestorsMap: Map<TreeKey, TreeKey[]>
  allKeys: TreeKey[]
}

/**
 * Builds high-performance flat maps for O(1) lookups, descendants tracking and ancestor chain recovery.
 */
export function buildTreeIndex<T>(nodes: TreeNodeData<T>[]): TreeIndex<T> {
  const nodeMap = new Map<TreeKey, TreeNodeData<T>>()
  const parentMap = new Map<TreeKey, TreeKey | null>()
  const directChildrenMap = new Map<TreeKey, TreeKey[]>()
  const descendantsMap = new Map<TreeKey, TreeKey[]>()
  const ancestorsMap = new Map<TreeKey, TreeKey[]>()
  const allKeys: TreeKey[] = []

  function traverse(list: TreeNodeData<T>[], parentAncestors: TreeKey[], parentId: TreeKey | null) {
    for (const node of list) {
      nodeMap.set(node.id, node)
      parentMap.set(node.id, parentId)
      ancestorsMap.set(node.id, parentAncestors)
      allKeys.push(node.id)

      const children = node.children ?? []
      const childKeys = children.map(c => c.id)
      directChildrenMap.set(node.id, childKeys)

      if (children.length > 0) {
        traverse(children, [...parentAncestors, node.id], node.id)
      }
    }
  }

  traverse(nodes, [], null)

  // Pre-calculate full descendants list per node
  for (const key of allKeys) {
    const descendants: TreeKey[] = []
    function collectDescendants(currentKey: TreeKey) {
      const children = directChildrenMap.get(currentKey) ?? []
      for (const childKey of children) {
        descendants.push(childKey)
        collectDescendants(childKey)
      }
    }
    collectDescendants(key)
    descendantsMap.set(key, descendants)
  }

  return { nodeMap, parentMap, directChildrenMap, descendantsMap, ancestorsMap, allKeys }
}

/**
 * Highlights search matches within node labels.
 */
export function HighlightText({ text, keyword }: { text?: string; keyword?: string }) {
  if (!text) return null
  if (!keyword || !keyword.trim()) {
    return <span className="truncate">{text}</span>
  }

  const trimmed = keyword.trim()
  const lowerText = text.toLowerCase()
  const lowerKeyword = trimmed.toLowerCase()
  const matchIndex = lowerText.indexOf(lowerKeyword)

  if (matchIndex === -1) {
    return <span className="truncate">{text}</span>
  }

  const before = text.slice(0, matchIndex)
  const matched = text.slice(matchIndex, matchIndex + trimmed.length)
  const after = text.slice(matchIndex + trimmed.length)

  return (
    <span className="truncate">
      {before}
      <mark className="rounded-xs bg-primary/20 px-0.5 font-medium text-primary">{matched}</mark>
      <HighlightText text={after} keyword={keyword} />
    </span>
  )
}

/**
 * Standalone Tree component that renders hierarchical data with high performance,
 * keyboard accessibility, search auto-expansion, mobile-first touch optimization,
 * and optional checkbox multi-selection.
 */
export function Tree<T = Record<string, unknown>>({
  data,
  selectedKey,
  onSelect,
  checkable = false,
  checkedKeys: controlledCheckedKeys,
  onCheckedChange,
  checkStrictly = false,
  expandedKeys: controlledExpandedKeys,
  defaultExpandedKeys,
  onExpandedKeysChange,
  defaultExpandAll = false,
  searchKeyword = '',
  showIcons = true,
  selectableLeafOnly = false,
  renderLabel,
  renderIcon,
  renderAction,
  emptyText = '暂无匹配数据',
  className,
  indentRem = 1.125
}: TreeProps<T>) {
  const index = React.useMemo(() => buildTreeIndex(data), [data])

  const initialExpandedKeys = React.useMemo(() => {
    if (defaultExpandAll) {
      return new Set(index.allKeys)
    }
    if (defaultExpandedKeys) {
      return new Set(defaultExpandedKeys)
    }
    // Auto expand ancestors of selected node by default so it's visible
    if (selectedKey !== undefined && selectedKey !== null) {
      const ancestors = index.ancestorsMap.get(selectedKey) ?? []
      return new Set(ancestors)
    }
    return new Set<TreeKey>()
  }, [defaultExpandAll, defaultExpandedKeys, selectedKey, index])

  const [uncontrolledExpandedKeys, setUncontrolledExpandedKeys] = React.useState<Set<TreeKey>>(initialExpandedKeys)

  const isControlledExpanded = controlledExpandedKeys !== undefined
  const expandedKeySet = React.useMemo(() => {
    return isControlledExpanded ? new Set(controlledExpandedKeys) : uncontrolledExpandedKeys
  }, [isControlledExpanded, controlledExpandedKeys, uncontrolledExpandedKeys])

  const updateExpandedKeys = React.useCallback(
    (nextSet: Set<TreeKey>) => {
      if (!isControlledExpanded) {
        setUncontrolledExpandedKeys(nextSet)
      }
      onExpandedKeysChange?.(Array.from(nextSet))
    },
    [isControlledExpanded, onExpandedKeysChange]
  )

  // Checked keys management
  const checkedKeySet = React.useMemo(() => {
    return new Set((controlledCheckedKeys ?? []).map(String))
  }, [controlledCheckedKeys])

  const handleToggleCheck = React.useCallback(
    (nodeId: TreeKey) => {
      const keyStr = String(nodeId)
      const isCurrentlyChecked = checkedKeySet.has(keyStr)
      const nextChecked = new Set(checkedKeySet)

      if (checkStrictly) {
        if (isCurrentlyChecked) {
          nextChecked.delete(keyStr)
        } else {
          nextChecked.add(keyStr)
        }
      } else {
        const descendants = (index.descendantsMap.get(nodeId) ?? []).map(String)

        if (isCurrentlyChecked) {
          nextChecked.delete(keyStr)
          for (const d of descendants) {
            nextChecked.delete(d)
          }
          const ancestors = (index.ancestorsMap.get(nodeId) ?? []).map(String)
          for (const a of ancestors) {
            nextChecked.delete(a)
          }
        } else {
          nextChecked.add(keyStr)
          for (const d of descendants) {
            nextChecked.add(d)
          }
          const ancestors = (index.ancestorsMap.get(nodeId) ?? []).map(String)
          for (const a of ancestors) {
            const children = (index.directChildrenMap.get(a) ?? []).map(String)
            const allChecked = children.every(c => nextChecked.has(c))
            if (allChecked) {
              nextChecked.add(a)
            }
          }
        }
      }

      onCheckedChange?.(Array.from(nextChecked))
    },
    [checkedKeySet, checkStrictly, index, onCheckedChange]
  )

  // When selectedKey changes and isn't visible, expand its ancestors
  React.useEffect(() => {
    if (selectedKey !== undefined && selectedKey !== null) {
      const ancestors = index.ancestorsMap.get(selectedKey) ?? []
      if (ancestors.length > 0) {
        const missing = ancestors.filter(k => !expandedKeySet.has(k))
        if (missing.length > 0) {
          const next = new Set(expandedKeySet)
          missing.forEach(k => next.add(k))
          updateExpandedKeys(next)
        }
      }
    }
  }, [selectedKey, index.ancestorsMap, expandedKeySet, updateExpandedKeys])

  // Search filter and auto-expansion
  const trimmedSearch = searchKeyword.trim().toLowerCase()
  const searchMatchInfo = React.useMemo(() => {
    if (!trimmedSearch) return null

    const matchedNodeKeys = new Set<TreeKey>()
    const searchExpandedKeys = new Set<TreeKey>()

    for (const [id, node] of index.nodeMap.entries()) {
      const content = `${node.label} ${node.searchTerms ?? ''}`.toLowerCase()
      if (content.includes(trimmedSearch)) {
        matchedNodeKeys.add(id)
        const ancestors = index.ancestorsMap.get(id) ?? []
        for (const ancestorId of ancestors) {
          matchedNodeKeys.add(ancestorId)
          searchExpandedKeys.add(ancestorId)
        }
      }
    }

    return { matchedNodeKeys, searchExpandedKeys }
  }, [trimmedSearch, index])

  // Compute visible flat nodes
  const visibleNodes = React.useMemo(() => {
    const list: Array<{ node: TreeNodeData<T>; depth: number; hasChildren: boolean }> = []

    function traverse(nodes: TreeNodeData<T>[], depth: number) {
      for (const node of nodes) {
        const hasChildren = Boolean(node.children && node.children.length > 0)

        if (searchMatchInfo) {
          if (!searchMatchInfo.matchedNodeKeys.has(node.id)) {
            continue
          }
          list.push({ node, depth, hasChildren })
          if (hasChildren && searchMatchInfo.searchExpandedKeys.has(node.id)) {
            traverse(node.children ?? [], depth + 1)
          }
        } else {
          list.push({ node, depth, hasChildren })
          if (hasChildren && expandedKeySet.has(node.id)) {
            traverse(node.children ?? [], depth + 1)
          }
        }
      }
    }

    traverse(data, 0)
    return list
  }, [data, searchMatchInfo, expandedKeySet])

  const toggleExpand = React.useCallback(
    (key: TreeKey, e: React.MouseEvent) => {
      e.stopPropagation()
      const next = new Set(expandedKeySet)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      updateExpandedKeys(next)
    },
    [expandedKeySet, updateExpandedKeys]
  )

  const handleSelect = React.useCallback(
    (node: TreeNodeData<T>) => {
      if (node.disabled) return
      if (checkable) {
        handleToggleCheck(node.id)
        return
      }
      if (selectableLeafOnly && node.children && node.children.length > 0) {
        return
      }
      onSelect?.(node.id, node)
    },
    [checkable, handleToggleCheck, onSelect, selectableLeafOnly]
  )

  if (visibleNodes.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-6 text-sm text-muted-foreground', className)}>
        {emptyText}
      </div>
    )
  }

  return (
    <div
      role="tree"
      className={cn(
        'flex flex-col gap-0.5 select-none overflow-x-auto overscroll-contain',
        '[--tree-indent:0.625rem] sm:[--tree-indent:1.125rem]',
        className
      )}
    >
      {visibleNodes.map(({ node, depth, hasChildren }) => {
        const keyStr = String(node.id)
        const isSelected = selectedKey !== undefined && selectedKey !== null && String(selectedKey) === keyStr
        const isChecked = checkable ? checkedKeySet.has(keyStr) : false
        const isExpanded = searchMatchInfo
          ? searchMatchInfo.searchExpandedKeys.has(node.id)
          : expandedKeySet.has(node.id)

        // Indeterminate check
        let isIndeterminate = false
        if (checkable && !checkStrictly && !isChecked && hasChildren) {
          const descendants = index.descendantsMap.get(node.id) ?? []
          isIndeterminate = descendants.some(d => checkedKeySet.has(String(d)))
        }

        const renderContext: TreeRenderNodeProps<T> = {
          node,
          depth,
          isExpanded,
          isSelected,
          isChecked,
          isIndeterminate,
          hasChildren,
          searchKeyword: trimmedSearch,
          toggleExpand: e => toggleExpand(node.id, e),
          selectNode: () => handleSelect(node),
          toggleCheck: () => handleToggleCheck(node.id)
        }

        const isClickable = !node.disabled && (checkable || !selectableLeafOnly || !hasChildren)

        return (
          <div
            key={keyStr}
            role="treeitem"
            aria-selected={isSelected || isChecked}
            aria-expanded={hasChildren ? isExpanded : undefined}
            tabIndex={node.disabled ? -1 : 0}
            className={cn(
              'group/tree-item relative flex min-h-8 sm:min-h-7.5 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm transition-colors outline-none',
              isClickable ? 'cursor-pointer' : 'cursor-default',
              isSelected
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-foreground hover:bg-accent/60 hover:text-accent-foreground',
              isChecked && 'bg-primary/5 text-foreground font-medium',
              node.disabled && 'cursor-not-allowed opacity-50'
            )}
            style={{
              paddingLeft: `calc(${depth} * var(--tree-indent, ${indentRem}rem) + 0.375rem)`
            }}
            onClick={() => handleSelect(node)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleSelect(node)
              } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
                e.preventDefault()
                const next = new Set(expandedKeySet)
                next.add(node.id)
                updateExpandedKeys(next)
              } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
                e.preventDefault()
                const next = new Set(expandedKeySet)
                next.delete(node.id)
                updateExpandedKeys(next)
              }
            }}
          >
            {/* Toggle arrow with generous touch target on mobile */}
            {hasChildren ? (
              <button
                type="button"
                tabIndex={-1}
                aria-label={isExpanded ? '折叠节点' : '展开节点'}
                className="flex size-6 sm:size-4 shrink-0 items-center justify-center rounded-xs text-muted-foreground transition-transform hover:text-foreground touch-manipulation -ml-1 sm:ml-0"
                onClick={e => toggleExpand(node.id, e)}
              >
                <ChevronRight className={cn('size-3.5 transition-transform duration-150', isExpanded && 'rotate-90')} />
              </button>
            ) : (
              <span className="size-6 sm:size-4 shrink-0 -ml-1 sm:ml-0" aria-hidden="true" />
            )}

            {/* Checkbox for checkable mode */}
            {checkable && (
              <Checkbox
                checked={isChecked}
                indeterminate={isIndeterminate}
                disabled={node.disabled}
                onCheckedChange={() => handleToggleCheck(node.id)}
                onClick={e => e.stopPropagation()}
                className="size-4 shrink-0"
                aria-label={node.label}
              />
            )}

            {/* Icon */}
            {showIcons && (
              <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                {renderIcon ? (
                  renderIcon(renderContext)
                ) : node.icon ? (
                  React.isValidElement(node.icon) ? (
                    node.icon
                  ) : (
                    React.createElement(node.icon as React.ComponentType<{ className?: string }>, {
                      className: 'size-4'
                    })
                  )
                ) : hasChildren ? (
                  isExpanded ? (
                    <FolderOpen className="size-4 text-primary/80" />
                  ) : (
                    <Folder className="size-4 text-primary/80" />
                  )
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/50" />
                )}
              </span>
            )}

            {/* Label and badges */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
              <div className="truncate">
                {renderLabel ? renderLabel(renderContext) : <HighlightText text={node.label} keyword={trimmedSearch} />}
              </div>
              {node.tag}
              {node.subtitle}
            </div>

            {/* Action buttons (e.g. edit, delete) */}
            {renderAction && renderAction(renderContext)}

            {/* Selected checkmark indicator for single select */}
            {!checkable && isSelected && <Check className="size-4 shrink-0 text-primary" />}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Animated skeleton placeholder for tree loading state.
 */
export function TreeSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  const depths = [0, 1, 2, 1, 0, 1, 2]

  return (
    <div className={cn('flex flex-col gap-1 p-2 select-none', className)}>
      {depths.slice(0, rows).map((depth, i) => (
        <div
          key={i}
          className="flex items-center gap-2 py-1.5"
          style={{ paddingLeft: `calc(${depth} * 1.125rem + 0.5rem)` }}
        >
          <Skeleton className="size-3.5 shrink-0 rounded-xs" />
          <Skeleton className="size-4 shrink-0 rounded-xs" />
          <Skeleton className="h-4 flex-1 rounded-sm" style={{ maxWidth: `${Math.max(80 - depth * 15, 35)}%` }} />
        </div>
      ))}
    </div>
  )
}
