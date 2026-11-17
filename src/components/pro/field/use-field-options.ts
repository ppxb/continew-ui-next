import { skipToken, useQuery } from '@tanstack/react-query'

import type { ProFieldColumn } from '../typing'
import { valueEnumToOptions } from './value-enum'

export function useFieldOptions<T>(column: ProFieldColumn<T>) {
  const key = column.proFieldProps?.proFieldKey
  const query = useQuery({
    queryKey: [...(key ?? ['pro-field', column.key ?? column.dataIndex]), ...(column.params ? [column.params] : [])],
    queryFn: column.request ? ({ signal }) => column.request!(column.params ?? {}, { signal }) : skipToken
  })
  return { ...query, options: query.data ?? valueEnumToOptions(column.valueEnum) }
}
