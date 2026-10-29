import * as React from 'react'

import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateRangeFilterProps {
  readonly value: DateRange | undefined
  readonly onChange: (value: DateRange | undefined) => void
  /** Shown while no range is picked. */
  readonly placeholder?: string
}

/**
 * A controlled day-range filter.
 *
 * Unlike `DateRangePicker`, it starts empty when the caller passes no value, so a screen
 * can decide whether a range applies by default.
 */
export function DateRangeFilter({ value, onChange, placeholder = '选择日期' }: DateRangeFilterProps) {
  const [open, setOpen] = React.useState(false)
  let label = placeholder

  if (value?.from) {
    const from = format(value.from, 'yyyy-MM-dd')
    label = value.to ? `${from} - ${format(value.to, 'yyyy-MM-dd')}` : from
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" className="border-input bg-transparent font-normal" />}>
        <CalendarDays />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar mode="range" defaultMonth={value?.from} selected={value} onSelect={onChange} numberOfMonths={2} />
      </PopoverContent>
    </Popover>
  )
}
