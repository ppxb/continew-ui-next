import * as React from 'react'

import { addDays, addYears, format } from 'date-fns'

import { Calendar as CalendarIcon, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface TenantExpiryPickerProps {
  /** The stored `yyyy-MM-dd HH:mm:ss` value, or an empty string for a tenant that never expires. */
  readonly value: string
  readonly onChange: (value: string) => void
  readonly onBlur?: () => void
  readonly invalid?: boolean
}

/**
 * The expiry picker for a tenant, built like the app form's: a popover with quick presets
 * and a single-day calendar. A picked day expires at the end of that day.
 */
export function TenantExpiryPicker({ value, onChange, onBlur, invalid }: TenantExpiryPickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedDate = value ? new Date(value.replace(/-/g, '/')) : undefined
  const hasValue = Boolean(value)

  const applyDate = (date: Date) => {
    onChange(`${format(date, 'yyyy-MM-dd')} 23:59:59`)
    setOpen(false)
  }

  const clear = () => {
    onChange('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative flex items-center">
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between pr-8 font-normal"
              aria-invalid={invalid}
              onBlur={onBlur}
            />
          }
        >
          <span className={hasValue ? 'text-foreground' : 'text-muted-foreground'}>
            {hasValue ? value.slice(0, 16) : '永不过期（点击设置过期时间）'}
          </span>
          <CalendarIcon className="size-4 text-muted-foreground" />
        </PopoverTrigger>

        {hasValue ? (
          <button
            type="button"
            onClick={event => {
              event.stopPropagation()
              clear()
            }}
            className="absolute right-2.5 z-10 text-muted-foreground transition-colors hover:text-foreground"
            title="清空并设为永不过期"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1.5 border-b pb-2">
            <Button type="button" size="xs" variant="outline" onClick={() => applyDate(addDays(new Date(), 30))}>
              30天
            </Button>
            <Button type="button" size="xs" variant="outline" onClick={() => applyDate(addDays(new Date(), 90))}>
              90天
            </Button>
            <Button type="button" size="xs" variant="outline" onClick={() => applyDate(addYears(new Date(), 1))}>
              1年
            </Button>
            <Button type="button" size="xs" variant="outline" onClick={() => applyDate(addYears(new Date(), 3))}>
              3年
            </Button>
            <Button type="button" size="xs" variant="ghost" onClick={clear}>
              永不过期
            </Button>
          </div>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={date => {
              if (!date) {
                clear()
              } else {
                applyDate(date)
              }
            }}
            disabled={date => date.getTime() < Date.now() - 24 * 60 * 60 * 1000}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
