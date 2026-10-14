import * as React from 'react'
import { cn } from 'cn'
import { ChevronsDownUp, ChevronsUpDown, ChevronDown, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tree, TreeSkeleton, type TreeKey, type TreeNodeData, type TreeProps } from '@/components/ui/tree'

export interface TreeSelectProps<T = Record<string, unknown>> {
  data: TreeNodeData<T>[]
  value?: TreeKey | null
  onChange?: (value: TreeKey | null, node: TreeNodeData<T> | null) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  loading?: boolean
  clearable?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  showExpandActions?: boolean
  showIcons?: boolean
  selectableLeafOnly?: boolean
  showPathInTrigger?: boolean
  pathSeparator?: string
  className?: string
  popupClassName?: string
  emptyText?: React.ReactNode
  renderLabel?: TreeProps<T>['renderLabel']
  renderIcon?: TreeProps<T>['renderIcon']
  size?: 'default' | 'sm'
}

/**
 * Reusable TreeSelect component built on shadcn styling and Popover primitive.
 * High-performance, keyboard navigable, searchable, and clearable.
 */
export function TreeSelect<T = Record<string, unknown>>({
  data,
  value,
  onChange,
  placeholder = '请选择',
  disabled = false,
  invalid = false,
  loading = false,
  clearable = true,
  searchable = true,
  searchPlaceholder = '搜索节点…',
  showExpandActions = true,
  showIcons = true,
  selectableLeafOnly = false,
  showPathInTrigger = false,
  pathSeparator = ' / ',
  className,
  popupClassName,
  emptyText = '暂无匹配节点',
  renderLabel,
  renderIcon,
  size = 'default'
}: TreeSelectProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [searchKeyword, setSearchKeyword] = React.useState('')
  const [expandedKeys, setExpandedKeys] = React.useState<TreeKey[] | undefined>(undefined)

  // Map of all nodes and ancestor chains for instant path/label lookups
  const { nodeMap, ancestorsMap, allKeys } = React.useMemo(() => {
    const map = new Map<TreeKey, TreeNodeData<T>>()
    const aMap = new Map<TreeKey, TreeKey[]>()
    const keys: TreeKey[] = []

    function traverse(nodes: TreeNodeData<T>[], ancestors: TreeKey[]) {
      for (const node of nodes) {
        map.set(node.id, node)
        aMap.set(node.id, ancestors)
        keys.push(node.id)
        if (node.children && node.children.length > 0) {
          traverse(node.children, [...ancestors, node.id])
        }
      }
    }

    traverse(data, [])
    return { nodeMap: map, ancestorsMap: aMap, allKeys: keys }
  }, [data])

  // Selected node and display text
  const selectedNode = value !== undefined && value !== null ? nodeMap.get(value) : null
  const hasValue = Boolean(selectedNode)

  const { displayText, fullPath } = React.useMemo(() => {
    if (!selectedNode || value === undefined || value === null) {
      return { displayText: '', fullPath: '' }
    }

    const ancestors = ancestorsMap.get(value) ?? []
    const pathSegments = [...ancestors.map(k => nodeMap.get(k)?.label).filter(Boolean), selectedNode.label]
    const path = pathSegments.join(pathSeparator)

    return {
      displayText: showPathInTrigger ? path : selectedNode.label,
      fullPath: path
    }
  }, [selectedNode, value, ancestorsMap, nodeMap, pathSeparator, showPathInTrigger])

  // Reset search when closed
  React.useEffect(() => {
    if (!open) {
      setSearchKeyword('')
    }
  }, [open])

  const handleSelect = (key: TreeKey, node: TreeNodeData<T>) => {
    onChange?.(key, node)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onChange?.(null, null)
  }

  const handleExpandAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedKeys(allKeys)
  }

  const handleCollapseAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedKeys([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            aria-invalid={invalid}
            aria-expanded={open}
            data-size={size}
            className={cn(
              'group/tree-trigger flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-left text-sm transition-colors outline-none select-none',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              'disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
              'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
              'dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
              size === 'sm' ? 'h-7 rounded-[min(var(--radius-md),10px)] text-xs' : 'h-8',
              className
            )}
          />
        }
      >
        <span
          title={fullPath || undefined}
          className={cn('flex-1 truncate', !hasValue ? 'text-muted-foreground' : 'text-foreground')}
        >
          {loading ? '加载中…' : hasValue ? displayText : placeholder}
        </span>

        <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
          {clearable && hasValue && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="清空已选"
              className="flex size-4 items-center justify-center rounded-xs opacity-70 transition-opacity hover:opacity-100"
              onClick={handleClear}
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronDown className={cn('size-4 opacity-60 transition-transform duration-150', open && 'rotate-180')} />
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn(
          'isolate z-50 flex flex-col gap-0 overflow-hidden p-0',
          'w-(--anchor-width) max-w-[28rem] min-w-64 rounded-lg shadow-md ring-1 ring-foreground/10',
          popupClassName
        )}
      >
        {/* Search & Action Toolbar */}
        {(searchable || showExpandActions) && (
          <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/20 px-2 py-1.5">
            {searchable && (
              <div className="relative flex flex-1 items-center">
                <Search className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-7 w-full rounded-md bg-transparent pr-7 pl-7 text-xs outline-none placeholder:text-muted-foreground"
                />
                {searchKeyword && (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="清空搜索"
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-1.5 flex size-4 items-center justify-center rounded-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            )}

            {showExpandActions && !searchKeyword && (
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="全部展开"
                  aria-label="全部展开"
                  onClick={handleExpandAll}
                >
                  <ChevronsUpDown className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="全部收起"
                  aria-label="全部收起"
                  onClick={handleCollapseAll}
                >
                  <ChevronsDownUp className="size-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tree Content Body */}
        <ScrollArea className="max-h-72 p-1">
          {loading ? (
            <TreeSkeleton rows={5} />
          ) : (
            <Tree
              data={data}
              selectedKey={value}
              onSelect={handleSelect}
              expandedKeys={expandedKeys}
              onExpandedKeysChange={setExpandedKeys}
              searchKeyword={searchKeyword}
              showIcons={showIcons}
              selectableLeafOnly={selectableLeafOnly}
              emptyText={emptyText}
              renderLabel={renderLabel}
              renderIcon={renderIcon}
            />
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
