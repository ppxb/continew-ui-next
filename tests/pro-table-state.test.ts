import { describe, expect, it } from 'vitest'

import {
  composeRequestParams,
  formatSearchValues,
  getSearchColumns,
  resetSearchPage
} from '@/components/pro/table/table-state'
import type { ProTableSearchState } from '@/components/pro/table/table-state'
import type { ProColumns } from '@/components/pro/typing'

type Row = { name: string; count: number; enabled: boolean; range: string[] }
const columns = [
  { dataIndex: 'name', title: '名称' },
  { dataIndex: 'count', valueType: 'digit', search: true },
  { dataIndex: 'enabled', valueType: 'select', search: true },
  {
    dataIndex: 'range',
    valueType: 'dateRange',
    search: {
      transform: value => {
        const range = value as string[]
        return { from: range[0], to: range[1] }
      }
    }
  },
  { valueType: 'index', search: true },
  { valueType: 'option', search: true }
] satisfies readonly ProColumns<Row>[]
const state: ProTableSearchState = {
  pagination: { pageIndex: 3, pageSize: 20 },
  values: {},
  keyword: '',
  searchText: '',
  paramsKey: 'initial'
}

describe('ProTable search state', () => {
  it('includes only opted-in editable fields, even when fields are hidden from the table', () => {
    expect(getSearchColumns(columns).map(column => column.dataIndex)).toEqual(['count', 'enabled', 'range'])
    expect(getSearchColumns([{ dataIndex: 'name', hideInTable: true, search: true }])).toHaveLength(1)
    expect(getSearchColumns(columns, true)).toEqual([])
  })

  it('retains numeric zero and boolean false while dropping empty transformed values', () => {
    expect(
      formatSearchValues(getSearchColumns(columns), { count: 0, enabled: false, range: ['2026-11-01', ''] })
    ).toEqual({ count: 0, enabled: false, from: '2026-11-01' })
    expect(formatSearchValues(getSearchColumns(columns), { count: null, enabled: undefined, range: [] })).toEqual({})
  })

  it('combines paging, transformed filters, named keyword, then external params', () => {
    expect(
      composeRequestParams(
        { ...state, values: { count: 0, enabled: false }, keyword: 'sample' },
        getSearchColumns(columns),
        true,
        'query',
        { count: 2 }
      )
    ).toEqual({
      current: 4,
      pageSize: 20,
      count: 2,
      enabled: false,
      query: 'sample'
    })
  })

  it('omits pagination at runtime for non-paginated tables', () => {
    expect(composeRequestParams(state, getSearchColumns(columns), false, undefined, { scope: 'tree' })).toEqual({
      scope: 'tree'
    })
  })

  it('resets page and filter values in one state transition without mutating old state', () => {
    const next = resetSearchPage(state, { values: { count: 0 }, keyword: 'new' })
    expect(next).toMatchObject({ pagination: { pageIndex: 0, pageSize: 20 }, values: { count: 0 }, keyword: 'new' })
    expect(state.pagination.pageIndex).toBe(3)
    expect(state.values).toEqual({})
  })
})
