import type { PaginationState } from '@tanstack/react-table'

import { isFieldColumn } from '../column-utils'
import type { ProColumns, ProFieldColumn, ProValues } from '../typing'

export interface ProTableSearchState {
  pagination: PaginationState
  values: ProValues
  keyword: string
  searchText: string
  paramsKey: string
}

export function getSearchColumns<T>(columns: readonly ProColumns<T>[], disabled = false): ProFieldColumn<T>[] {
  return disabled ? [] : columns.filter(isFieldColumn).filter(column =>
    Boolean(column.search) && Boolean(column.dataIndex) && column.valueType !== 'index' && column.valueType !== 'option'
  )
}

function isNonempty(value: unknown) {
  return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.some(isNonempty))
}

export function formatSearchValues<T>(columns: readonly ProFieldColumn<T>[], values: ProValues): ProValues {
  const result: ProValues = {}
  for (const column of columns) {
    const name = column.dataIndex
    if (!name || !isNonempty(values[name])) continue
    const transformed = typeof column.search === 'object' ? column.search.transform(values[name], name) : { [name]: values[name] }
    for (const [key, value] of Object.entries(transformed)) {
      if (isNonempty(value)) result[key] = value
    }
  }
  return result
}

export function composeRequestParams<T>(
  state: ProTableSearchState,
  columns: readonly ProFieldColumn<T>[],
  pagination: boolean,
  keywordName: string | undefined,
  params: ProValues | undefined
): ProValues {
  const filters = formatSearchValues(columns, state.values)
  if (keywordName) delete filters[keywordName]
  return {
    ...(pagination ? { current: state.pagination.pageIndex + 1, pageSize: state.pagination.pageSize } : {}),
    ...filters,
    ...(keywordName && state.keyword ? { [keywordName]: state.keyword } : {}),
    ...params
  }
}

export function resetSearchPage(state: ProTableSearchState, patch: Partial<ProTableSearchState>): ProTableSearchState {
  return { ...state, ...patch, pagination: { ...state.pagination, pageIndex: 0 } }
}
