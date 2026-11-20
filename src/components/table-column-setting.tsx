import * as React from 'react'

import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import type { ReactTable, RowData } from '@tanstack/react-table'
import { cn } from 'cn'
import { GripVertical, Pin, SlidersHorizontal } from 'lucide-react'

import type { ColumnsSetting } from '@/components/pro/table/columns-setting'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DataTableFeatures } from '@/lib/data-table-features'

type Side = 'start' | 'end'

interface SettingItem {
  readonly id: string
  readonly label: React.ReactNode
  readonly canHide: boolean
}

interface TableColumnSettingProps<TRow extends RowData> {
  readonly table: ReactTable<DataTableFeatures, TRow>
  /** Labels for columns whose header renders a node instead of a string. */
  readonly labels?: Record<string, React.ReactNode>
  readonly value: ColumnsSetting
  /** Column ids in definition order; pinned columns keep this order within their side. */
  readonly definitionOrder: readonly string[]
  readonly onChange: (next: ColumnsSetting) => void
  readonly onSave: () => void
  readonly onReset: () => void
}

const PIN_LABELS: Record<Side, string> = { start: '左固定', end: '右固定' }

/**
 * Column settings for a list table, after ContiNew Admin's: show or hide, drag the unpinned
 * columns to reorder, and pin columns to either side. Every change applies at once; 保存 keeps the
 * layout across reloads and 重置 drops it.
 */
export function TableColumnSetting<TRow extends RowData>({
  table,
  labels,
  value,
  definitionOrder,
  onChange,
  onSave,
  onReset
}: TableColumnSettingProps<TRow>) {
  const [open, setOpen] = React.useState(false)
  const { start, end } = value.columnPinning

  const items = React.useMemo(() => {
    const byId = new Map<string, SettingItem>()
    for (const column of table.getAllLeafColumns()) {
      if (column.columnDef.meta?.hideInSetting) continue
      const header = column.columnDef.header
      byId.set(column.id, {
        id: column.id,
        label: typeof header === 'string' ? header : (labels?.[column.id] ?? column.id),
        canHide: column.getCanHide()
      })
    }
    // The table's display order: start-pinned, unpinned in column order, then end-pinned.
    const center = value.columnOrder.filter(id => !start.includes(id) && !end.includes(id))
    return [...start, ...center, ...end].flatMap(id => byId.get(id) ?? [])
  }, [table, labels, value.columnOrder, start, end])

  const isVisible = (id: string) => value.columnVisibility[id] !== false
  const hideable = items.filter(item => item.canHide)
  const visibleCount = hideable.filter(item => isVisible(item.id)).length
  const allChecked = hideable.length > 0 && visibleCount === hideable.length

  // Hiding a column also unpins it, so the pinned blocks only ever hold visible columns.
  const setVisibility = (ids: readonly string[], visible: boolean) =>
    onChange({
      ...value,
      columnVisibility: { ...value.columnVisibility, ...Object.fromEntries(ids.map(id => [id, visible])) },
      columnPinning: visible
        ? value.columnPinning
        : { start: start.filter(id => !ids.includes(id)), end: end.filter(id => !ids.includes(id)) }
    })

  const togglePin = (id: string, side: Side) => {
    const pinned = start.includes(id) ? 'start' : end.includes(id) ? 'end' : undefined
    const next = { start: start.filter(other => other !== id), end: end.filter(other => other !== id) }
    if (pinned !== side) {
      // Pinned columns keep their definition order within a side, wherever they were dragged.
      const ids = new Set([...next[side], id])
      next[side] = definitionOrder.filter(other => ids.has(other))
    }
    onChange({ ...value, columnPinning: next })
  }

  const move = (from: number, to: number) => {
    const ids = items.map(item => item.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    // Only unpinned columns drag; put their new order into the slots they hold in `columnOrder`.
    const ordered = ids.filter(id => !start.includes(id) && !end.includes(id))
    const slots = new Set(ordered)
    let next = 0
    onChange({ ...value, columnOrder: value.columnOrder.map(id => (slots.has(id) ? ordered[next++] : id)) })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="icon" aria-label="列设置" />}>
        <SlidersHorizontal />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-0 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={allChecked}
              indeterminate={visibleCount > 0 && !allChecked}
              disabled={hideable.length === 0}
              onCheckedChange={checked =>
                setVisibility(
                  hideable.map(item => item.id),
                  checked
                )
              }
            />
            全选
          </label>
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => {
              onReset()
              toast.add({ title: '已重置表格列', type: 'success' })
            }}
          >
            重置
          </Button>
        </div>

        <DragDropProvider
          onDragEnd={event => {
            const { source } = event.operation
            if (event.canceled || !isSortable(source)) return
            if (source.initialIndex !== source.index) move(source.initialIndex, source.index)
          }}
        >
          <ul className="max-h-72 overflow-y-auto py-1" aria-label="列">
            {items.map((item, index) => (
              <SettingRow
                key={item.id}
                item={item}
                index={index}
                pinned={start.includes(item.id) ? 'start' : end.includes(item.id) ? 'end' : undefined}
                visible={isVisible(item.id)}
                onVisibleChange={visible => setVisibility([item.id], visible)}
                onPin={side => togglePin(item.id, side)}
              />
            ))}
          </ul>
        </DragDropProvider>

        <div className="border-t p-2">
          <Button
            className="w-full"
            onClick={() => {
              onSave()
              setOpen(false)
              toast.add({ title: '保存成功', type: 'success' })
            }}
          >
            保存
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SettingRow({
  item,
  index,
  pinned,
  visible,
  onVisibleChange,
  onPin
}: {
  readonly item: SettingItem
  readonly index: number
  readonly pinned: Side | undefined
  readonly visible: boolean
  readonly onVisibleChange: (visible: boolean) => void
  readonly onPin: (side: Side) => void
}) {
  // Pinned columns follow their definition order, so only unpinned ones can be dragged.
  const { ref, handleRef, isDragging } = useSortable({ id: item.id, index, disabled: Boolean(pinned) })

  return (
    <li
      ref={ref}
      className={cn(
        'flex items-center gap-2 bg-popover px-2 py-1 text-sm',
        isDragging && 'relative z-10 rounded-md shadow-md'
      )}
    >
      <button
        ref={handleRef}
        type="button"
        disabled={Boolean(pinned)}
        aria-label={`拖动排序 ${typeof item.label === 'string' ? item.label : item.id}`}
        className="cursor-grab text-muted-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4"
      >
        <GripVertical />
      </button>
      <label className={cn('flex min-w-0 flex-1 items-center gap-2', !item.canHide && 'text-muted-foreground')}>
        <Checkbox
          checked={item.canHide ? visible : true}
          disabled={!item.canHide}
          onCheckedChange={checked => onVisibleChange(checked)}
        />
        <span className="truncate">{item.label}</span>
      </label>
      {(['start', 'end'] as const).map(side => (
        <Tooltip key={side}>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={PIN_LABELS[side]}
                aria-pressed={pinned === side}
                disabled={!visible}
                className={cn(pinned === side ? 'text-primary' : 'text-muted-foreground')}
                onClick={() => onPin(side)}
              />
            }
          >
            <Pin className={side === 'start' ? 'rotate-45' : '-rotate-45'} />
          </TooltipTrigger>
          <TooltipContent side="top">{PIN_LABELS[side]}</TooltipContent>
        </Tooltip>
      ))}
    </li>
  )
}
