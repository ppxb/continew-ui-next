// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProTable } from '@/components/pro/table/pro-table'
import type { ProTableProps } from '@/components/pro/typing'
import { installBrowserAnimationApis } from './browser-apis'

type Row = { id: number; name: string }
const clients: QueryClient[] = []
let restoreAnimations: () => void

beforeEach(() => {
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
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  restoreAnimations = installBrowserAnimationApis()
})

afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
  restoreAnimations()
  vi.unstubAllGlobals()
})

function renderPagination(pagination?: ProTableProps<Row>['pagination']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  clients.push(client)
  const request = vi.fn(async (params: { current?: number }) => ({
    data: [{ id: params.current ?? 1, name: `Page ${params.current ?? 1}` }],
    total: 1000
  }))
  render(
    <QueryClientProvider client={client}>
      <ProTable<Row>
        columns={[{ dataIndex: 'name', title: '记录' }]}
        rowKey="id"
        queryKey={['pagination-controls']}
        request={request}
        pagination={pagination}
        search={false}
        options={false}
      />
    </QueryClientProvider>
  )
  return request
}

describe('configured pagination', () => {
  it('jumps on Enter and blur, showing the total and page-size label', async () => {
    const request = renderPagination()
    await screen.findByText('Page 1')
    expect(screen.getByText('共 1000 条')).toBeTruthy()
    expect(screen.getByRole('combobox', { name: '每页条数' }).textContent).toContain('10 条/页')
    fireEvent.change(screen.getByRole('textbox', { name: '跳转页码' }), { target: { value: '25' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '跳转页码' }), { key: 'Enter' })
    await screen.findByText('Page 25')
    expect(request.mock.calls.at(-1)?.[0].current).toBe(25)
    expect((screen.getByRole('textbox', { name: '跳转页码' }) as HTMLInputElement).value).toBe('')
    fireEvent.change(screen.getByRole('textbox', { name: '跳转页码' }), { target: { value: '70' } })
    fireEvent.blur(screen.getByRole('textbox', { name: '跳转页码' }))
    await screen.findByText('Page 70')
    expect(request.mock.calls.at(-1)?.[0].current).toBe(70)
  })

  it('does not request empty or invalid pages and bounds whole-number jumps', async () => {
    const request = renderPagination()
    await screen.findByText('Page 1')
    for (const value of ['', '2.5', '-1', 'abc', '1e2', '99999999999999999999']) {
      fireEvent.change(screen.getByRole('textbox', { name: '跳转页码' }), { target: { value } })
      fireEvent.keyDown(screen.getByRole('textbox', { name: '跳转页码' }), { key: 'Enter' })
    }
    expect(request).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByRole('textbox', { name: '跳转页码' }), { target: { value: '999' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '跳转页码' }), { key: 'Enter' })
    await screen.findByText('Page 100')
    expect(request.mock.calls.at(-1)?.[0].current).toBe(100)
    fireEvent.change(screen.getByRole('textbox', { name: '跳转页码' }), { target: { value: '0' } })
    fireEvent.blur(screen.getByRole('textbox', { name: '跳转页码' }))
    await screen.findByText('Page 1')
    await waitFor(() => expect(request.mock.calls.at(-1)?.[0].current).toBe(1))
  })

  it('can hide the jumper without hiding pagination and omit all controls for unpaginated tables', async () => {
    renderPagination({ align: 'left', showQuickJumper: false })
    await screen.findByText('Page 1')
    expect(screen.queryByRole('textbox', { name: '跳转页码' })).toBeNull()
    expect(screen.getByRole('navigation', { name: 'pagination' })).toBeTruthy()
    cleanup()
    const request = renderPagination(false)
    await screen.findByText('Page 1')
    expect(screen.queryByRole('navigation', { name: 'pagination' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: '跳转页码' })).toBeNull()
    expect(request.mock.calls[0][0]).toEqual({})
  })
})
