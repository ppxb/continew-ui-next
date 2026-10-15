import * as React from 'react'

import { CheckSquare, ChevronDown, ChevronUp, Search, Square, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import {
  buildTreeIndex,
  Tree,
  type TreeKey,
  type TreeNodeData,
  TreeSkeleton
} from '@/components/ui/tree'
import { cn } from 'cn'

export type CheckableTreeNode<T = Record<string, unknown>> = TreeNodeData<T>

export interface RoleCheckableTreeProps<T = Record<string, unknown>> {
  readonly data: CheckableTreeNode<T>[]
  readonly checkedKeys: Array<string | number>
  readonly onCheckedChange: (keys: Array<string | number>) => void
  readonly checkStrictly?: boolean
  readonly loading?: boolean
  readonly showSearch?: boolean
  readonly searchPlaceholder?: string
  readonly showExpandActions?: boolean
  readonly showSelectActions?: boolean
  readonly className?: string
  readonly emptyText?: string
}

export function RoleCheckableTree<T = Record<string, unknown>>({
  data,
  checkedKeys,
  onCheckedChange,
  checkStrictly = false,
  loading = false,
  showSearch = true,
  searchPlaceholder = '搜索节点',
  showExpandActions = true,
  showSelectActions = true,
  className,
  emptyText = '暂无匹配节点'
}: RoleCheckableTreeProps<T>) {
  const [search, setSearch] = React.useState('')
  const [expandedKeys, setExpandedKeys] = React.useState<TreeKey[]>([])

  const index = React.useMemo(() => buildTreeIndex(data), [data])

  // Initialize expanded keys to all nodes on first load
  React.useEffect(() => {
    if (index.allKeys.length > 0) {
      setExpandedKeys(index.allKeys)
    }
  }, [index.allKeys])

  const handleExpandAll = () => {
    setExpandedKeys(index.allKeys)
  }

  const handleCollapseAll = () => {
    setExpandedKeys([])
  }

  const handleSelectAll = () => {
    onCheckedChange(index.allKeys.map(k => String(k)))
  }

  const handleClearAll = () => {
    onCheckedChange([])
  }

  if (loading) {
    return <TreeSkeleton rows={7} className={className} />
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {/* Mobile-first Responsive Header action bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {showSearch && (
          <div className="w-full sm:min-w-44 sm:flex-1">
            <InputGroup className="h-8">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="清空搜索"
                  className="mr-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </InputGroup>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-1 sm:justify-end">
          {showExpandActions && (
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="xs" onClick={handleExpandAll} className="h-7 text-xs">
                <ChevronDown className="size-3" />
                展开全部
              </Button>
              <Button type="button" variant="outline" size="xs" onClick={handleCollapseAll} className="h-7 text-xs">
                <ChevronUp className="size-3" />
                折叠全部
              </Button>
            </div>
          )}

          {showSelectActions && (
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="xs" onClick={handleSelectAll} className="h-7 text-xs">
                <CheckSquare className="size-3" />
                全选
              </Button>
              <Button type="button" variant="ghost" size="xs" onClick={handleClearAll} className="h-7 text-xs">
                <Square className="size-3" />
                清空
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Nodes list container with smooth touch scrolling and responsive indentation */}
      <div className="max-h-[380px] min-h-36 overflow-y-auto overscroll-contain rounded-md border bg-background/50 p-1.5 select-none">
        <Tree
          data={data}
          checkable
          checkedKeys={checkedKeys}
          onCheckedChange={onCheckedChange}
          checkStrictly={checkStrictly}
          expandedKeys={expandedKeys}
          onExpandedKeysChange={setExpandedKeys}
          searchKeyword={search}
          emptyText={emptyText}
        />
      </div>

      {/* Selected summary */}
      <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>已勾选 {checkedKeys.length} 项</span>
        <span>共 {index.allKeys.length} 个节点</span>
      </div>
    </div>
  )
}
