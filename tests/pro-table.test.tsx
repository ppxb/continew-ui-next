// @vitest-environment jsdom
import * as React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider
} from '@tanstack/react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProTable } from '@/components/pro/table/pro-table'
import { TableDropdown } from '@/components/pro/table/table-dropdown'
import type {
  ActionType,
  ProColumns,
  ProFormInstance,
  ProTableProps,
  ProValues,
  RequestData
} from '@/components/pro/typing'
import { installBrowserAnimationApis } from './browser-apis'
import { SEARCH_DEBOUNCE_MS } from '@/hooks/use-debounced-value'

type Row = { id: string; name: string; count: number; children?: Row[] }
const COLUMNS = [
  { valueType: 'index', title: '序号' },
  { dataIndex: 'name', title: '名称' },
  {
    dataIndex: 'count',
    title: '数量',
    valueType: 'digit',
    search: { inline: true },
    initialValue: 99,
    fieldProps: { placeholder: '筛选数量' }
  }
] satisfies readonly ProColumns<Row>[]
const clients: QueryClient[] = []
let restoreAnimationApis: () => void

function response(params: ProValues, name?: string): RequestData<Row> {
  return {
    data: [{ id: `row-${params.current ?? 1}`, name: name ?? `Page ${params.current ?? 1}`, count: 1 }],
    total: 30,
    success: true
  }
}

function renderTable(overrides: Partial<ProTableProps<Row>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  clients.push(client)
  const actionRef = React.createRef<ActionType | undefined>()
  const formRef = React.createRef<ProFormInstance | undefined>()
  const defaults = {
    rowKey: 'id',
    queryKey: ['pro-table-regression'],
    columns: COLUMNS,
    request: async (params: ProValues) => response(params),
    actionRef,
    formRef,
    options: { search: { name: 'query', placeholder: '搜索关键字' } }
  } satisfies ProTableProps<Row>
  const element = () => (
    <QueryClientProvider client={client}>
      <ProTable {...defaults} {...overrides} />
    </QueryClientProvider>
  )
  const view = render(element())
  return {
    ...view,
    client,
    actionRef,
    formRef,
    rerenderTable: (next: Partial<ProTableProps<Row>>) => {
      overrides = { ...overrides, ...next }
      view.rerender(element())
    }
  }
}

/** Renders the table as the page of a `routePath` route opened at `url`, as the app shell does. */
function renderRoutedTable(routePath: string, url: string, overrides: Partial<ProTableProps<Row>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
  clients.push(client)
  const root = createRootRoute({ component: Outlet })
  const page = createRoute({
    getParentRoute: () => root,
    path: routePath,
    component: () => (
      <ProTable
        rowKey="id"
        queryKey={['pro-table-routed']}
        columns={COLUMNS}
        request={async params => response(params)}
        {...overrides}
      />
    )
  })
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [url] })
  })
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  // jsdom has no layout observers; the real table and field components remain mounted.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 0)
  )
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => clearTimeout(handle))
  // The router restores scroll on navigation, which jsdom does not implement.
  vi.stubGlobal('scrollTo', () => {})
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false
  }))
  restoreAnimationApis = installBrowserAnimationApis()
})

afterEach(async () => {
  cleanup()
  window.localStorage.clear()
  for (const client of clients.splice(0)) client.clear()
  await Promise.resolve()
  restoreAnimationApis()
  vi.unstubAllGlobals()
})

describe('ProTable requests and actions', () => {
  it('atomically resets a later page on field and keyword search, retaining pending rows', async () => {
    let pauseNext = false
    const pending = Promise.withResolvers<RequestData<Row>>()
    const request = vi.fn((params: ProValues) => {
      if (pauseNext) {
        pauseNext = false
        return pending.promise
      }
      return Promise.resolve(response(params))
    })
    renderTable({ request })
    await screen.findByText('Page 1')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('Page 2')
    pauseNext = true
    fireEvent.change(screen.getByPlaceholderText('筛选数量'), { target: { value: '0' } })
    await waitFor(() => expect(request.mock.calls.at(-1)?.[0]).toMatchObject({ current: 1, count: 0 }))
    expect(request.mock.calls.some(([params]) => params.current === 2 && params.count === 0)).toBe(false)
    expect(screen.getByText('Page 2')).toBeTruthy()
    await act(async () => {
      pending.resolve(response({ current: 1 }, 'Filtered first page'))
      await pending.promise
    })
    await screen.findByText('Filtered first page')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('Page 2')
    fireEvent.change(screen.getByPlaceholderText('搜索关键字'), { target: { value: 'needle' } })
    await waitFor(() => expect(request.mock.calls.at(-1)?.[0]).toMatchObject({ current: 1, count: 0, query: 'needle' }))
    expect(request.mock.calls.some(([params]) => params.current === 2 && params.query === 'needle')).toBe(false)
  })

  it('resets changed external params before requesting and ignores request-reference-only changes', async () => {
    const request = vi.fn(async (params: ProValues) => response(params, `${params.scope} page ${params.current}`))
    const view = renderTable({ request, params: { scope: 'A' } })
    await screen.findByText('A page 1')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('A page 2')
    view.rerenderTable({ params: { scope: 'B' } })
    await screen.findByText('B page 1')
    expect(request.mock.calls.some(([params]) => params.scope === 'B' && params.current === 2)).toBe(false)
    const replacement = vi.fn(async (params: ProValues) => response(params, 'Replacement'))
    await act(async () => {
      view.rerenderTable({ request: replacement })
    })
    expect(replacement).not.toHaveBeenCalled()
    expect(screen.getByText('B page 1')).toBeTruthy()
  })

  it('reload(true) refreshes only the correct cached page and resolves after its data arrives', async () => {
    let pauseNext = false
    const pending = Promise.withResolvers<RequestData<Row>>()
    const request = vi.fn((params: ProValues) => {
      if (pauseNext) {
        pauseNext = false
        return pending.promise
      }
      return Promise.resolve(response(params))
    })
    const view = renderTable({ request })
    await screen.findByText('Page 1')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('Page 2')
    const before = request.mock.calls.length
    pauseNext = true
    let settled = false
    let reload!: Promise<void>
    act(() => {
      reload = view.actionRef.current!.reload(true)
      void reload.then(() => {
        settled = true
      })
    })
    await waitFor(() => expect(request.mock.calls.length).toBe(before + 1))
    expect(request.mock.calls.slice(before).map(([params]) => params.current)).toEqual([1])
    expect(settled).toBe(false)
    await act(async () => {
      pending.resolve(response({ current: 1 }, 'Reloaded first page'))
      await reload
    })
    await screen.findByText('Reloaded first page')
    expect(settled).toBe(true)
    expect(view.actionRef.current!.pageInfo).toMatchObject({ current: 1, pageSize: 10, total: 30 })
  })

  it('cancels an in-flight pre-mutation request and awaits fresh reload data', async () => {
    const previous = Promise.withResolvers<RequestData<Row>>()
    const fresh = Promise.withResolvers<RequestData<Row>>()
    let requestCount = 0
    const request = vi.fn<ProTableProps<Row>['request']>(() =>
      ++requestCount === 1 ? previous.promise : fresh.promise
    )
    const view = renderTable({ request })
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    const previousSignal = request.mock.calls[0][3]
    let settled = false
    let reload!: Promise<void>
    act(() => {
      reload = view.actionRef.current!.reload()
      void reload.then(() => {
        settled = true
      })
    })
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    expect(previousSignal.aborted).toBe(true)
    expect(request.mock.calls[1][3].aborted).toBe(false)
    await act(async () => {
      previous.resolve(response({ current: 1 }, 'Pre-mutation rows'))
      await previous.promise
    })
    expect(screen.queryByText('Pre-mutation rows')).toBeNull()
    expect(settled).toBe(false)
    await act(async () => {
      fresh.resolve(response({ current: 1 }, 'Fresh reload rows'))
      await reload
    })
    await screen.findByText('Fresh reload rows')
    expect(settled).toBe(true)
    expect(request.mock.calls.map(([params]) => params.current)).toEqual([1, 1])
  })

  it('exports the committed keyword rather than the draft or a vetoed search', async () => {
    const onSearch = vi.fn(() => false)
    const request = vi.fn(async (params: ProValues) => response(params))
    const view = renderTable({ request, options: { search: { name: 'query', placeholder: '搜索关键字', onSearch } } })
    await screen.findByText('Page 1')
    act(() => {
      view.formRef.current!.setFieldsValue({ query: 'committed' })
    })
    await waitFor(() => expect(request.mock.calls.at(-1)?.[0]).toMatchObject({ query: 'committed' }))
    fireEvent.change(screen.getByPlaceholderText('搜索关键字'), { target: { value: 'blocked draft' } })
    expect(view.formRef.current!.getFieldsValue()).toEqual({ query: 'blocked draft' })
    expect(view.formRef.current!.getFieldsFormatValue()).toEqual({ query: 'committed' })
    await waitFor(() => expect(onSearch).toHaveBeenCalledExactlyOnceWith('blocked draft'))
    expect(view.formRef.current!.getFieldsFormatValue()).toEqual({ query: 'committed' })
    expect(request.mock.calls.map(([params]) => params.query)).toEqual([undefined, 'committed'])
  })

  it('ignores a delayed identical keyword after programmatic submission and page navigation', async () => {
    const onSearch = vi.fn()
    const request = vi.fn(async (params: ProValues) => response(params))
    const view = renderTable({ request, options: { search: { name: 'query', placeholder: '搜索关键字', onSearch } } })
    await screen.findByText('Page 1')
    fireEvent.change(screen.getByPlaceholderText('搜索关键字'), { target: { value: 'submitted' } })
    act(() => {
      view.formRef.current!.submit()
    })
    await waitFor(() => expect(request.mock.calls.at(-1)?.[0]).toMatchObject({ current: 1, query: 'submitted' }))
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('Page 2')
    const timer = Promise.withResolvers<void>()
    setTimeout(timer.resolve, SEARCH_DEBOUNCE_MS + 20)
    await act(async () => {
      await timer.promise
    })
    expect(view.actionRef.current!.pageInfo.current).toBe(2)
    expect(screen.getByText('Page 2')).toBeTruthy()
    expect(onSearch).not.toHaveBeenCalled()
    expect(request.mock.calls.map(([params]) => [params.current, params.query])).toEqual([
      [1, undefined],
      [1, 'submitted'],
      [2, 'submitted']
    ])
  })

  it('refreshes a manual-request table through the toolbar reload action', async () => {
    const request = vi.fn<ProTableProps<Row>['request']>(async params => response(params))
    renderTable({ request, manualRequest: true })
    expect(request).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '刷新' }))
    await screen.findByText('Page 1')
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0].slice(0, 3)).toEqual([{ current: 1, pageSize: 10 }, {}, {}])
    expect(request.mock.calls[0][3].aborted).toBe(false)
  })

  it('keeps create defaults out of searches and resets current form values and visible keyword', async () => {
    const request = vi.fn(async (params: ProValues) => response(params))
    const view = renderTable({ request, form: { initialValues: { count: 7 } } })
    await screen.findByText('Page 1')
    expect(request.mock.calls[0][0]).toMatchObject({ count: 7 })
    expect(request.mock.calls[0][0].count).not.toBe(99)
    const savedAction = view.actionRef.current!
    const savedForm = view.formRef.current!
    act(() => {
      savedAction.setPageInfo({ current: 2 })
    })
    await screen.findByText('Page 2')
    expect(savedAction.pageInfo.current).toBe(2)
    act(() => {
      savedForm.setFieldsValue({ count: 0, query: '  padded  ' })
    })
    await waitFor(() => expect(request.mock.calls.at(-1)?.[0]).toMatchObject({ current: 1, count: 0, query: 'padded' }))
    expect(savedForm.getFieldValue('count')).toBe(0)
    expect(savedForm.getFieldsFormatValue()).toEqual({ count: 0, query: 'padded' })
    act(() => {
      savedForm.resetFields()
    })
    expect((screen.getByPlaceholderText('搜索关键字') as HTMLInputElement).value).toBe('')
    expect((screen.getByPlaceholderText('筛选数量') as HTMLInputElement).value).toBe('7')
    expect(savedForm.getFieldsFormatValue()).toEqual({ count: 7 })
    await waitFor(() => expect(request.mock.calls.at(-1)?.[0]).toMatchObject({ current: 1, count: 7 }))
    view.unmount()
    expect(view.actionRef.current).toBeNull()
    expect(view.formRef.current).toBeNull()
  })

  it('holds manual requests until an imperative reload or form submission', async () => {
    const request = vi.fn(async (params: ProValues) => response(params))
    const view = renderTable({ request, manualRequest: true })
    expect(request).not.toHaveBeenCalled()
    await act(async () => {
      await view.actionRef.current!.reload()
    })
    await screen.findByText('Page 1')
    act(() => {
      view.formRef.current!.setFieldsValue({ count: 0 })
    })
    expect(request).toHaveBeenCalledTimes(1)
    act(() => {
      view.formRef.current!.submit()
    })
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    expect(request.mock.calls[1][0]).toMatchObject({ current: 1, count: 0 })
  })

  it('shows unsuccessful responses as errors and retries through the real table', async () => {
    let success = false
    const request = vi.fn(async (params: ProValues) =>
      success ? response(params) : { data: [], total: 0, success: false }
    )
    renderTable({ request })
    await screen.findByText('数据加载失败')
    expect(screen.queryByText('暂无数据')).toBeNull()
    success = true
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    await screen.findByText('Page 1')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('applies column settings at once, keeps locked columns visible, and resets to the defaults', async () => {
    // The key follows the route template, so every user id shares one saved layout.
    const key = 'table-columns-settings-:system:user:$id'
    renderRoutedTable('/system/user/$id', '/system/user/7', {
      columns: [...COLUMNS.slice(0, 2), { ...COLUMNS[2], hideInSetting: true }],
      columnsState: { defaultValue: { name: { show: false } } },
      disabledColumnKeys: ['index']
    })
    await screen.findByRole('columnheader', { name: '序号' })
    expect(screen.queryByRole('columnheader', { name: '名称' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '列设置' }))
    const nameItem = await screen.findByRole('checkbox', { name: '名称' })
    // Locked columns are listed but cannot be hidden; excluded columns are not listed at all.
    expect(screen.getByRole('checkbox', { name: '序号' }).getAttribute('aria-disabled')).toBe('true')
    expect(screen.queryByRole('checkbox', { name: '数量' })).toBeNull()
    fireEvent.click(nameItem)
    await screen.findByRole('columnheader', { name: '名称' })
    // Unsaved changes stay in memory only.
    expect(window.localStorage.getItem(key)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(window.localStorage.getItem(key)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '列设置' }))
    fireEvent.click(await screen.findByRole('button', { name: '重置' }))
    await waitFor(() => expect(screen.queryByRole('columnheader', { name: '名称' })).toBeNull())
    expect(window.localStorage.getItem(key)).toBeNull()
  })

  it('restores saved columns per table id, pins in definition order, and unpins hidden columns', async () => {
    const columns = [...COLUMNS.slice(0, 2), { ...COLUMNS[2], search: false }]
    const headers = () => screen.getAllByRole('columnheader').map(cell => cell.textContent)
    const pinStart = (label: string) =>
      fireEvent.click(
        within(screen.getByRole('checkbox', { name: label }).closest('li')!).getByRole('button', { name: '左固定' })
      )
    const first = renderRoutedTable('/demo', '/demo', { columns, tableId: 'first' })
    await screen.findByRole('columnheader', { name: '数量' })
    fireEvent.click(screen.getByRole('button', { name: '列设置' }))
    await screen.findByRole('checkbox', { name: '名称' })
    // Pin 数量 and then 名称: both sit before 序号, in definition order rather than click order.
    pinStart('数量')
    pinStart('名称')
    await waitFor(() => expect(headers()).toEqual(['名称', '数量', '序号']))
    // Hiding a pinned column unpins it.
    fireEvent.click(screen.getByRole('checkbox', { name: '名称' }))
    await waitFor(() => expect(headers()).toEqual(['数量', '序号']))
    fireEvent.click(screen.getByRole('checkbox', { name: '名称' }))
    await waitFor(() => expect(headers()).toEqual(['数量', '序号', '名称']))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    first.unmount()

    renderRoutedTable('/demo', '/demo', { columns, tableId: 'first' })
    await screen.findByRole('columnheader', { name: '数量' })
    expect(headers()).toEqual(['数量', '序号', '名称'])
    cleanup()

    renderRoutedTable('/demo', '/demo', { columns, tableId: 'second' })
    await screen.findByRole('columnheader', { name: '名称' })
    expect(headers()).toEqual(['序号', '名称', '数量'])
  })

  it('applies drawer filters only on 应用, guards unapplied edits, and removes them by tag', async () => {
    const request = vi.fn(async (params: ProValues) => response(params))
    renderTable({ request, columns: [COLUMNS[0], { ...COLUMNS[1], search: true }, COLUMNS[2]] })
    await screen.findByText('Page 1')
    fireEvent.click(screen.getByRole('button', { name: '筛选' }))
    fireEvent.change(await screen.findByLabelText('名称'), { target: { value: 'needle' } })
    expect(request.mock.calls.some(([params]) => params.name === 'needle')).toBe(false)

    // A close with unapplied edits asks first; 继续编辑 keeps the draft.
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    fireEvent.click(await screen.findByRole('button', { name: '继续编辑' }))
    expect((screen.getByLabelText('名称') as HTMLInputElement).value).toBe('needle')

    fireEvent.click(screen.getByRole('button', { name: '应用' }))
    await waitFor(() => expect(request.mock.calls.at(-1)?.[0]).toMatchObject({ current: 1, name: 'needle' }))
    expect(screen.getByLabelText('已选条件').textContent).toContain('名称：needle')

    fireEvent.click(screen.getByRole('button', { name: '移除筛选条件 名称' }))
    await waitFor(() => expect(request.mock.calls.at(-1)?.[0].name).toBeUndefined())
    expect(screen.queryByLabelText('已选条件')).toBeNull()
  })

  it('expands controlled tree rows and changes local postData without requesting or paginating', async () => {
    const tree: Row[] = [
      { id: 'parent', name: 'Parent', count: 1, children: [{ id: 'child', name: 'Child', count: 2 }] }
    ]
    const request = vi.fn<ProTableProps<Row>['request']>(async () => ({ data: tree, success: true }))
    const onExpandedRowsChange = vi.fn()
    const view = renderTable({
      request,
      pagination: false,
      cardProps: false,
      options: false,
      toolBarRender: false,
      expandable: { expandedRowKeys: ['parent'], onExpandedRowsChange }
    })
    await screen.findByText('Child')
    expect(request.mock.calls[0]).toHaveLength(4)
    expect(request.mock.calls[0][0]).toEqual({})
    expect(screen.queryByRole('navigation', { name: 'pagination' })).toBeNull()
    expect(screen.getByRole('table').closest('[data-slot="card"]')).toBeNull()
    expect(screen.queryByRole('button', { name: '刷新' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '收起子级' }))
    expect(onExpandedRowsChange).toHaveBeenLastCalledWith([])
    expect(screen.getByText('Child')).toBeTruthy()
    view.rerenderTable({ expandable: { expandedRowKeys: [], onExpandedRowsChange } })
    await waitFor(() => expect(screen.queryByText('Child')).toBeNull())
    view.rerenderTable({ postData: () => [] })
    await screen.findByText('暂无数据')
    expect(request).toHaveBeenCalledTimes(1)
  })
})

describe('TableDropdown', () => {
  it('drops hidden and leftover divider entries while keeping disabled and dangerous actions', async () => {
    const onSelect = vi.fn()
    render(
      <TableDropdown
        onSelect={onSelect}
        menus={[
          { type: 'divider' },
          false,
          { key: 'edit', name: '修改', disabled: true },
          { type: 'divider' },
          undefined,
          { type: 'divider' },
          { key: 'delete', name: '删除', danger: true },
          { type: 'divider' }
        ]}
      />
    )
    fireEvent.click(screen.getByRole('button'))
    const disabled = await screen.findByRole('menuitem', { name: '修改' })
    expect(disabled.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getAllByRole('separator')).toHaveLength(1)
    const deletion = screen.getByRole('menuitem', { name: '删除' })
    expect(deletion.getAttribute('data-variant')).toBe('destructive')
    fireEvent.click(deletion)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('delete')
  })
})
