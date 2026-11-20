import { Fragment } from 'react'

import { format } from 'date-fns'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getColumnTitle } from '../column-utils'
import { useFieldOptions } from '../field/use-field-options'
import type { ProFieldColumn, ProValues } from '../typing'
import { formatSearchValues } from './table-state'

interface FilterTagsProps<T> {
  /** The drawer filters; inline ones already show their value in place. */
  readonly columns: readonly ProFieldColumn<T>[]
  readonly values: ProValues
  readonly onRemove: (name: string) => void
  readonly onClear: () => void
}

/** One tag per applied drawer filter, each removable, plus 清空全部. */
export function FilterTags<T>({ columns, values, onRemove, onClear }: FilterTagsProps<T>) {
  const applied = columns.filter(column => Object.keys(formatSearchValues([column], values)).length > 0)
  if (applied.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="已选条件">
      {applied.map(column => (
        <FilterTag
          key={column.dataIndex}
          column={column}
          value={values[column.dataIndex!]}
          onRemove={() => onRemove(column.dataIndex!)}
        />
      ))}
      <Button variant="link" size="sm" className="h-auto px-1" onClick={onClear}>
        清空全部
      </Button>
    </div>
  )
}

function FilterTag<T>({
  column,
  value,
  onRemove
}: {
  readonly column: ProFieldColumn<T>
  readonly value: unknown
  readonly onRemove: () => void
}) {
  const { options } = useFieldOptions(column)
  const title = getColumnTitle(column, 'table')
  const renderValue = typeof column.search === 'object' ? column.search.renderValue : undefined
  const items = Array.isArray(value) ? value : [value]
  const text = renderValue
    ? renderValue(value)
    : options.length > 0
      ? items.map((item, index) => (
          <Fragment key={String(item)}>
            {index > 0 ? '、' : null}
            {options.find(option => String(option.value) === String(item))?.label ?? String(item)}
          </Fragment>
        ))
      : rangeText(value)

  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-md border bg-muted/40 pr-1 pl-2 text-xs">
      <span className="text-muted-foreground">{title}：</span>
      <span className="max-w-48 truncate">{text}</span>
      <button
        type="button"
        aria-label={`移除筛选条件 ${typeof title === 'string' ? title : ''}`}
        className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3.5"
        onClick={onRemove}
      >
        <X />
      </button>
    </span>
  )
}

/**
 * Text for a value without options: date ranges (a day-picker `{ from, to }` or a `[start, end]`
 * pair, whose whole-day times are dropped) read `start ~ end`; anything else as is.
 */
function rangeText(value: unknown) {
  if (value && typeof value === 'object' && 'from' in value) {
    const { from, to } = value as { from?: Date; to?: Date }
    const day = (date: Date) => format(date, 'yyyy-MM-dd')
    return from ? `${day(from)} ~ ${day(to ?? from)}` : ''
  }
  if (Array.isArray(value)) return value.map(item => String(item).replace(/ (00:00:00|23:59:59)$/, '')).join(' ~ ')
  return String(value)
}
