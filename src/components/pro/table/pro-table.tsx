import * as React from 'react'
import { hashKey, keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTable } from '@tanstack/react-table'
import type { ColumnVisibilityState, ExpandedState, PaginationState, ReactTable, RowData, Updater } from '@tanstack/react-table'
import { cn } from 'cn'

import { DataTable } from '@/components/data-table'
import { ListFilterRow } from '@/components/list-filter-row'
import { ListPageCard } from '@/components/list-page-card'
import { QueryState } from '@/components/query-state'
import { TableFillArea } from '@/components/table-fill-area'
import { TableSearch } from '@/components/table-search'
import { TableToolbar } from '@/components/table-toolbar'
import { useFullscreenTransition } from '@/hooks/use-fullscreen-transition'
import { usePageClamp } from '@/hooks/use-page-clamp'
import { dataTableFeatures } from '@/lib/data-table-features'
import type { DataTableFeatures } from '@/lib/data-table-features'
import { getColumnKey, getColumnTitle, getFieldColumns } from '../column-utils'
import type { ActionType, FilterValue, ProFormInstance, ProTableProps, ProValues, SortOrder } from '../typing'
import { ProTableSearchFields } from './form-render'
import { genProColumnToColumn } from './gen-pro-column-to-column'
import { composeRequestParams, formatSearchValues, getSearchColumns, resetSearchPage } from './table-state'
import type { ProTableSearchState } from './table-state'

const EMPTY_SORT: Record<string, SortOrder> = {}
const EMPTY_FILTER: Record<string, FilterValue> = {}
const EMPTY_ROWS: never[] = []

export function ProTable<T extends RowData, U extends ProValues = ProValues>(props: ProTableProps<T, U>) {
  const queryClient = useQueryClient()
  const fullscreen = useFullscreenTransition()
  const localData = props.request === undefined
  const propsRef = React.useRef(props)
  propsRef.current = props
  const requestRef = React.useRef(props.request)
  requestRef.current = props.request
  const fullscreenToggleRef = React.useRef(fullscreen.toggleFullscreen)
  fullscreenToggleRef.current = fullscreen.toggleFullscreen
  const paramsKey = hashKey([props.params])
  const options = props.options === false ? undefined : props.options
  const keywordOptions = options?.search
  const keywordWasVetoed = React.useRef(false)
  const keywordName = props.search !== false && keywordOptions ? typeof keywordOptions === 'object' ? keywordOptions.name ?? 'keyword' : 'keyword' : undefined
  const searchColumns = React.useMemo(() => getSearchColumns(props.columns, props.search === false), [props.columns, props.search])
  const [storedState, setStoredState] = React.useState<ProTableSearchState>(() => {
    const initial: ProValues = props.form?.initialValues ?? {}
    const keyword = keywordName && typeof initial[keywordName] === 'string' ? initial[keywordName] as string : ''
    return {
      pagination: { pageIndex: 0, pageSize: props.pagination === false ? 10 : props.pagination?.defaultPageSize ?? 10 },
      values: { ...initial }, keyword, searchText: keyword, paramsKey
    }
  })
  // Derive the reset before creating the query, so new external filters never request the old page.
  const state = storedState.paramsKey === paramsKey ? storedState : resetSearchPage(storedState, { paramsKey })
  if (state !== storedState) setStoredState(state)
  const stateRef = React.useRef(state)
  stateRef.current = state
  const totalRef = React.useRef(0)
  const commitState = React.useCallback((next: ProTableSearchState) => {
    stateRef.current = next
    setStoredState(next)
  }, [])

  const createQueryOptions = React.useCallback((next: ProTableSearchState) => {
    const currentProps = propsRef.current
    const currentOptions = currentProps.options === false ? undefined : currentProps.options
    const search = currentOptions?.search
    const name = currentProps.search !== false && search ? typeof search === 'object' ? search.name ?? 'keyword' : 'keyword' : undefined
    const params = composeRequestParams(next, getSearchColumns(currentProps.columns, currentProps.search === false), currentProps.pagination !== false, name, currentProps.params)
    return {
      queryKey: currentProps.request ? [...currentProps.queryKey, params, EMPTY_SORT, EMPTY_FILTER] : [...currentProps.queryKey, 'local-table'],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        if (!requestRef.current) throw new Error('ProTable request is not configured')
        const result = await requestRef.current(params as U & { current: number; pageSize: number }, EMPTY_SORT, EMPTY_FILTER, signal)
        if (result.success === false) throw new Error('数据加载失败')
        return result
      }
    }
  }, [])
  const query = useQuery({ ...createQueryOptions(state), enabled: !localData && !props.manualRequest, placeholderData: keepPreviousData })
  const { refetch } = query
  const [submitVersion, setSubmitVersion] = React.useState(0)
  React.useEffect(() => {
    if (submitVersion > 0) void refetch({ cancelRefetch: false })
  }, [submitVersion, refetch])
  const rawRows = localData ? props.dataSource ?? EMPTY_ROWS : query.data?.data ?? EMPTY_ROWS
  const rows = props.postData ? props.postData(rawRows) : rawRows
  const total = localData || props.pagination === false ? rows.length : query.data?.total ?? rows.length
  const isLoading = props.loading ?? (!localData && query.isPending)
  const isError = Boolean(props.isError) || (!localData && query.isError)
  const isShowingPreviousRows = props.isShowingPreviousRows ?? (!localData && query.isPlaceholderData)
  const loadingRef = React.useRef(isLoading || (!localData && query.isFetching))
  loadingRef.current = isLoading || (!localData && query.isFetching)
  totalRef.current = total

  const setPagination = React.useCallback((updater: Updater<PaginationState>) => {
    const previous = stateRef.current
    const pagination = typeof updater === 'function' ? updater(previous.pagination) : updater
    commitState({ ...previous, pagination })
  }, [commitState])
  usePageClamp(localData ? isLoading || isShowingPreviousRows ? undefined : total : props.pagination === false || query.isPlaceholderData || query.isFetching ? undefined : query.data?.total, state.pagination, setPagination)

  const refresh = React.useCallback(async (next: ProTableSearchState) => {
    if (!propsRef.current.request) {
      commitState(next)
      await queryClient.invalidateQueries({ queryKey: propsRef.current.queryKey })
      return
    }
    const queryOptions = createQueryOptions(next)
    // Discard the pre-mutation request before fetching a fresh result for the target page.
    await queryClient.cancelQueries({ queryKey: queryOptions.queryKey, exact: true })
    void queryClient.invalidateQueries({ queryKey: propsRef.current.queryKey, refetchType: 'none' })
    commitState(next)
    await queryClient.fetchQuery(queryOptions)
  }, [queryClient, commitState, createQueryOptions])
  const restoreSearch = React.useCallback(() => {
    const next = resetSearchPage(stateRef.current, { values: { ...propsRef.current.form?.initialValues }, keyword: '', searchText: '' })
    commitState(next)
    if (!propsRef.current.request) {
      void queryClient.invalidateQueries({ queryKey: propsRef.current.queryKey })
      return
    }
    void queryClient.invalidateQueries({ queryKey: propsRef.current.queryKey, refetchType: 'none' })
    // Only the target page may refetch. If it is not mounted yet, its observer fetches on mount.
    void queryClient.invalidateQueries({ queryKey: createQueryOptions(next).queryKey, exact: true })
  }, [commitState, queryClient, createQueryOptions])
  const action = React.useMemo<ActionType>(() => ({
    reload: (resetPageIndex = false) => refresh(resetPageIndex ? resetSearchPage(stateRef.current, {}) : stateRef.current),
    reloadAndRest: () => refresh(resetSearchPage(stateRef.current, {})),
    reset: restoreSearch,
    setPageInfo: page => {
      const previous = stateRef.current
      const pageSize = page.pageSize === undefined ? previous.pagination.pageSize : Math.max(1, page.pageSize)
      const pageIndex = page.current === undefined ? page.pageSize === undefined ? previous.pagination.pageIndex : 0 : Math.max(0, page.current - 1)
      commitState({ ...previous, pagination: { pageSize, pageIndex } })
    },
    fullScreen: () => fullscreenToggleRef.current(),
    get pageInfo() {
      return { current: stateRef.current.pagination.pageIndex + 1, pageSize: stateRef.current.pagination.pageSize, total: totalRef.current }
    }
  }), [commitState, refresh, restoreSearch])

  const getSearchSnapshot = React.useCallback((formatted: boolean): U => {
    const current = propsRef.current
    const search = current.options === false ? undefined : current.options?.search
    const name = current.search !== false && search ? typeof search === 'object' ? search.name ?? 'keyword' : 'keyword' : undefined
    const previous = stateRef.current
    const values = formatted ? formatSearchValues(getSearchColumns(current.columns, current.search === false), previous.values) : { ...previous.values }
    if (name) {
      delete values[name]
      const keyword = formatted ? previous.keyword : previous.searchText
      if (!formatted || keyword) values[name] = keyword
    }
    return values as U
  }, [])
  const form = React.useMemo<ProFormInstance<U>>(() => ({
    get isSubmitting() { return loadingRef.current },
    getFieldValue: name => getSearchSnapshot(false)[name],
    getFieldsValue: () => getSearchSnapshot(false),
    getFieldsFormatValue: () => getSearchSnapshot(true),
    setFieldsValue: values => {
      const current = propsRef.current
      const search = current.options === false ? undefined : current.options?.search
      const name = current.search !== false && search ? typeof search === 'object' ? search.name ?? 'keyword' : 'keyword' : undefined
      const previous = stateRef.current
      const patch: Partial<ProTableSearchState> = { values: { ...previous.values, ...values } }
      if (name && name in values) {
        const keyword = typeof values[name] === 'string' ? values[name] as string : ''
        patch.searchText = keyword
        patch.keyword = keyword.trim()
      }
      commitState(resetSearchPage(previous, patch))
    },
    resetFields: restoreSearch,
    submit: () => {
      const previous = stateRef.current
      const next = resetSearchPage(previous, { keyword: previous.searchText.trim() })
      void queryClient.invalidateQueries({ queryKey: propsRef.current.queryKey, refetchType: propsRef.current.request ? 'none' : 'active' })
      commitState(next)
      if (propsRef.current.request) setSubmitVersion(version => version + 1)
    }
  }), [getSearchSnapshot, commitState, restoreSearch, queryClient])

  React.useImperativeHandle(props.actionRef, () => action, [action])
  React.useImperativeHandle(props.formRef, () => form, [form])

  const defaultVisibility = React.useMemo<ColumnVisibilityState>(() => {
    const visibility: ColumnVisibilityState = {}
    getFieldColumns(props.columns).forEach((column, index) => {
      if (column.hideInTable || column.valueType === 'index' || column.valueType === 'option') return
      const key = getColumnKey(column, index)
      if (props.columnsState?.defaultValue?.[key]?.show === false) visibility[key] = false
    })
    return visibility
  }, [props.columns, props.columnsState])
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(defaultVisibility)
  const [internalExpanded, setInternalExpanded] = React.useState<ExpandedState>(props.expandable?.defaultExpandAllRows ? true : {})
  const expandedRowKeys = props.expandable?.expandedRowKeys
  const expanded = React.useMemo<ExpandedState>(() => expandedRowKeys === undefined
    ? internalExpanded
    : Object.fromEntries(expandedRowKeys.map(key => [key, true])), [expandedRowKeys, internalExpanded])
  const columns = React.useMemo(() => genProColumnToColumn(props.columns, {
    action, rowOffset: localData || props.pagination === false ? 0 : state.pagination.pageIndex * state.pagination.pageSize,
    emptyText: props.columnEmptyText, expandable: Boolean(props.expandable)
  }), [props.columns, action, props.pagination, localData, state.pagination.pageIndex, state.pagination.pageSize, props.columnEmptyText, props.expandable])
  const tableRef = React.useRef<ReactTable<DataTableFeatures, T> | null>(null)
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: rows,
    state: { pagination: state.pagination, columnVisibility, expanded },
    manualPagination: !localData || props.pagination === false,
    autoResetPageIndex: false,
    autoResetExpanded: false,
    paginateExpandedRows: false,
    rowCount: total,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: record => typeof props.rowKey === 'function' ? props.rowKey(record) : String(record[props.rowKey]),
    ...(props.expandable ? { getSubRows: (record: T) => {
      const name = props.expandable?.childrenColumnName ?? 'children'
      const children = (record as Record<string, unknown>)[name]
      return Array.isArray(children) ? children as T[] : undefined
    } } : {}),
    onExpandedChange: updater => {
      const next = typeof updater === 'function' ? updater(expanded) : updater
      if (props.expandable?.expandedRowKeys === undefined) setInternalExpanded(next)
      const keys = next === true ? tableRef.current!.getPreExpandedRowModel().flatRows.filter(row => row.getCanExpand()).map(row => row.id) : Object.keys(next).filter(key => next[key])
      props.expandable?.onExpandedRowsChange?.(keys)
    }
  })
  tableRef.current = table
  const columnLabels = React.useMemo(() => Object.fromEntries(getFieldColumns(props.columns).map((column, index) => {
    const title = getColumnTitle(column, 'table')
    return [getColumnKey(column, index), title]
  })), [props.columns])
  const filters = props.search === false || (!keywordName && !searchColumns.length) ? undefined : <>
    {keywordName ? <TableSearch
      value={state.searchText}
      onValueChange={searchText => commitState({ ...stateRef.current, searchText })}
      onSearch={keyword => {
        if (keyword === stateRef.current.keyword && !keywordWasVetoed.current) return
        const vetoed = typeof keywordOptions === 'object' && keywordOptions.onSearch?.(keyword) === false
        keywordWasVetoed.current = vetoed
        if (vetoed) return
        commitState(resetSearchPage(stateRef.current, { keyword }))
      }}
      placeholder={typeof keywordOptions === 'object' ? keywordOptions.placeholder : undefined}
      delay={typeof keywordOptions === 'object' ? keywordOptions.delay : undefined}
      clearable
    /> : null}
    <ProTableSearchFields columns={searchColumns} values={state.values} form={form as ProFormInstance} onChange={(name, value) => {
      commitState(resetSearchPage(stateRef.current, { values: { ...stateRef.current.values, [name]: value } }))
    }} />
  </>
  const toolbarButtons = React.Children.toArray(props.toolBarRender ? props.toolBarRender(action) : undefined)
  const showToolbar = toolbarButtons.length > 0 || (props.options !== false && (options?.reload !== false || options?.setting !== false || options?.fullScreen !== false))
  const actions = showToolbar ? <TableToolbar
    table={table}
    actions={toolbarButtons}
    options={props.options}
    isRefreshing={localData ? isLoading && rows.length > 0 : query.isFetching && !query.isPending}
    isFullscreen={fullscreen.isFullscreen}
    onRefresh={() => void action.reload()}
    onToggleFullscreen={action.fullScreen}
    onResetColumns={() => setColumnVisibility(defaultVisibility)}
    columnLabels={columnLabels}
  /> : undefined
  const tableContent = <>
    {isError && rows.length > 0 ? <QueryState state="error" title="数据加载失败" onRetry={() => void action.reload()} /> : null}
    <DataTable
      table={table}
      isLoading={isLoading}
      isError={isError}
      isShowingPreviousRows={isShowingPreviousRows}
      onRetry={() => void action.reload()}
      emptyTitle={props.locale?.emptyText}
      className={props.tableClassName}
      showPagination={props.pagination !== false}
      pagination={props.pagination === false ? undefined : props.pagination}
      fillHeight
    />
  </>
  const content = props.embedded
    ? <div className="flex min-h-0 flex-1 flex-col">{tableContent}</div>
    : <TableFillArea fullscreen={fullscreen}>{tableContent}</TableFillArea>
  if (props.cardProps === false) return <div className={cn('flex flex-col gap-4', props.embedded && 'min-h-0 flex-1')}>
    {fullscreen.isFullscreen ? <div ref={fullscreen.spacerRef} style={{ height: fullscreen.reservedHeight }} /> : null}
    <div ref={fullscreen.fullscreenRef} className={cn('flex flex-col gap-4', props.embedded && 'min-h-0 flex-1', fullscreen.isFullscreen && 'bg-background')}>
      {props.headerTitle || props.toolbar?.subTitle ? <header className="px-4">
        {props.headerTitle ? <h2 className="text-xl font-semibold">{props.headerTitle}</h2> : null}
        {props.toolbar?.subTitle ? <div className="text-sm text-muted-foreground">{props.toolbar.subTitle}</div> : null}
      </header> : null}
      <ListFilterRow filters={filters} actions={actions} />
      {content}
    </div>
  </div>
  return <ListPageCard title={props.headerTitle} description={props.toolbar?.subTitle} filters={filters} actions={actions} fullscreen={fullscreen}>{content}</ListPageCard>
}
