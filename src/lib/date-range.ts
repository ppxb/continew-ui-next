import { endOfDay, format, startOfDay, subDays } from 'date-fns'
import type { DateRange } from 'react-day-picker'

const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm:ss'

/**
 * The range the monitor screens start with: today plus the days before it.
 *
 * A picked range covers whole days, while the backend filters on timestamps, so the end is
 * widened to the last second of the last picked day.
 */
export function createRecentDateRange(days = 7): DateRange {
  const to = new Date()
  return { from: subDays(to, days - 1), to }
}

/** Formats a picked range as the backend's `start,end` `LocalDateTime` filter. */
export function toDateTimeRangeQuery(range: DateRange | undefined) {
  if (!range?.from) {
    return undefined
  }

  const from = format(startOfDay(range.from), DATE_TIME_FORMAT)
  const to = format(endOfDay(range.to ?? range.from), DATE_TIME_FORMAT)
  return `${from},${to}`
}
