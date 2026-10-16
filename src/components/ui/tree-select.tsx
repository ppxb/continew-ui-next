import * as React from 'react'
import { cn } from 'cn'
import { ChevronsDownUp, ChevronsUpDown, ChevronDown, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
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
  triggerPrefix?: React.ReactNode
  showAllOption?: boolean
  allOptionLabel?: string
  placeholderColor?: 'muted' | 'foreground'
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
  size = 'default',
  triggerPrefix,
  showAllOption = false,
  allOptionLabel = '全部',
  placeholderColor = 'muted'
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

  const triggerText = loading ? '加载中…' : hasValue ? displayText : placeholder
  const triggerTextClassName = cn(
    'truncate',
    !hasValue && placeholderColor === 'muted' ? 'text-muted-foreground' : 'text-foreground'
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={size}
            disabled={disabled}
            aria-invalid={invalid}
            className={cn(
              'w-full justify-between gap-1.5 pr-2 pl-2.5 text-left text-sm font-normal',
              size === 'sm' ? 'h-7 rounded-[min(var(--radius-md),10px)]' : 'h-8 rounded-lg',
              className
            )}
          />
        }
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {triggerPrefix && <span className="shrink-0 text-muted-foreground">{triggerPrefix}</span>}
          {fullPath ? (
            <Tooltip>
              <TooltipTrigger render={<span className={triggerTextClassName} />}>{triggerText}</TooltipTrigger>
              <TooltipContent side="top">{fullPath}</TooltipContent>
            </Tooltip>
          ) : (
            <span className={triggerTextClassName}>{triggerText}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
          {clearable && hasValue && !disabled && (
            <span
              className="flex size-4 items-center justify-center rounded-xs opacity-70 transition-opacity hover:opacity-100"
              onClick={handleClear}
              onPointerDown={e => e.stopPropagation()}
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronDown
            className={cn('size-4 text-muted-foreground transition-transform duration-150', open && 'rotate-180')}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn(
          'isolate z-50 flex flex-col gap-0 overflow-hidden p-0',
          'w-(--anchor-width) max-w-md min-w-64 rounded-lg shadow-md ring-1 ring-foreground/10',
          popupClassName
        )}
      >
        {/* Search & Action Toolbar */}
        {(searchable || showExpandActions) && (
          <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/20 px-2 py-1.5">
            {searchable && (
              <div className="relative flex flex-1 items-center">
                <Search className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-7 rounded-md border-0 bg-transparent py-0 pr-7 pl-7 text-xs focus-visible:ring-0 md:text-xs dark:bg-transparent"
                />
                {searchKeyword && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          tabIndex={-1}
                          className="absolute right-1.5 size-4 text-muted-foreground hover:text-foreground"
                          onClick={() => setSearchKeyword('')}
                        />
                      }
                    >
                      <X className="size-3" />
                    </TooltipTrigger>
                    <TooltipContent side="top">清空搜索</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}

            {showExpandActions && !searchKeyword && (
              <div className="flex shrink-0 items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger
                    render={<Button type="button" variant="ghost" size="icon-xs" onClick={handleExpandAll} />}
                  >
                    <ChevronsUpDown className="size-3" />
                  </TooltipTrigger>
                  <TooltipContent side="top">全部展开</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={<Button type="button" variant="ghost" size="icon-xs" onClick={handleCollapseAll} />}
                  >
                    <ChevronsDownUp className="size-3" />
                  </TooltipTrigger>
                  <TooltipContent side="top">全部收起</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        )}

        {/* Tree Content Body */}
        <div className="max-h-72 overflow-y-auto overscroll-contain p-1">
          {showAllOption && !searchKeyword && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onChange?.(null, null)
                setOpen(false)
              }}
              className={cn(
                'mb-1 flex h-auto w-full cursor-pointer items-center justify-start gap-2 rounded-md px-2 py-1.5 text-xs font-normal transition-colors outline-none',
                !hasValue
                  ? 'bg-accent font-medium text-accent-foreground hover:bg-accent'
                  : 'text-foreground hover:bg-muted/50'
              )}
            >
              <span>{allOptionLabel}</span>
            </Button>
          )}
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
        </div>
      </PopoverContent>
    </Popover>
  )
}
