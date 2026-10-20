import * as React from 'react'

import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface LoginTimeFilterProps {
  readonly value: DateRange | undefined
  readonly onChange: (value: DateRange | undefined) => void
}

/**
 * The login-time range filter.
 *
 * The range is picked by whole days; the caller widens it to the first and last second of
 * the chosen days, because a day-granular range ending at midnight would drop that day's
 * sessions.
 */
export function LoginTimeFilter({ value, onChange }: LoginTimeFilterProps) {
  const [open, setOpen] = React.useState(false)
  let label = '登录时间'

  if (value?.from) {
    const from = format(value.from, 'yyyy-MM-dd')
    label = value.to ? `${from} - ${format(value.to, 'yyyy-MM-dd')}` : from
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button size="sm" variant="outline" className="font-normal" />}>
        <CalendarDays />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar mode="range" defaultMonth={value?.from} selected={value} onSelect={onChange} numberOfMonths={2} />
      </PopoverContent>
    </Popover>
  )
}
