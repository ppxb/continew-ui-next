// @vitest-environment jsdom

import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { ProTable } from '@/components/pro/table/pro-table'
import { BetaSchemaForm } from '@/components/pro/form/beta-schema-form'
import { installBrowserAnimationApis } from './browser-apis'

const clients: QueryClient[] = []
let restoreAnimations: () => void
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }))
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

function createClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  clients.push(client)
  return client
}

describe('rollout table sources and custom submitters', () => {
  it('paginates a local data source once and keeps continuous serial numbers', async () => {
    const dataSource = Array.from({ length: 26 }, (_, index) => ({ id: index + 1, name: `Row ${index + 1}` }))
    render(<QueryClientProvider client={createClient()}><ProTable columns={[{ valueType: 'index', title: '序号' }, { dataIndex: 'name', title: 'Name' }]} dataSource={dataSource} rowKey="id" queryKey={['local-paging']} options={false} search={false} /></QueryClientProvider>)
    expect(await screen.findByText('Row 1')).toBeTruthy()
    expect(screen.queryByText('Row 11')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    const row = (await screen.findByText('Row 11')).closest('tr')!
    expect(within(row).getByRole('cell', { name: '11' })).toBeTruthy()
    expect(screen.queryByText('Row 21')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(await screen.findByText('Row 26')).toBeTruthy()
    expect(screen.queryByText('Row 20')).toBeNull()
  })

  it('refreshes the upstream query for local tables and clamps a shrinking result', async () => {
    const request = vi.fn(async () => Array.from({ length: request.mock.calls.length === 1 ? 26 : 2 }, (_, index) => ({ id: index + 1, name: `${request.mock.calls.length === 1 ? 'Original' : 'Updated'} ${index + 1}` })))
    function Example() {
      const query = useQuery({ queryKey: ['local-source', 'rows'], queryFn: request })
      return <ProTable columns={[{ dataIndex: 'name', title: 'Name' }]} dataSource={query.data ?? []} loading={query.isFetching} isError={query.isError} rowKey="id" queryKey={['local-source']} options={{ setting: false, fullScreen: false }} search={false} />
    }
    render(<QueryClientProvider client={createClient()}><Example /></QueryClientProvider>)
    await screen.findByText('Original 1')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await screen.findByText('Original 11')
    fireEvent.click(screen.getByRole('button', { name: '刷新' }))
    await screen.findByText('Updated 1')
    expect(request).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Original 11')).toBeNull()
    const nextPage = screen.getByRole('button', { name: '下一页' })
    expect(nextPage.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(nextPage)
    expect(screen.getByText('Updated 1')).toBeTruthy()
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('routes a custom draft footer through validation and parsed form submission', async () => {
    const onFinish = vi.fn(async () => false)
    const columns = [{ dataIndex: 'name', title: 'Name', formItemProps: { required: false, rules: z.string().trim().min(1, 'Name is required') } }] as const
    render(<QueryClientProvider client={createClient()}><BetaSchemaForm columns={columns} grid onFinish={onFinish} submitter={{ render: ({ submit, isSubmitting }) => <button type="button" disabled={isSubmitting} onClick={submit}>存草稿</button> }} /></QueryClientProvider>)
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }))
    expect(await screen.findByText('Name is required')).toBeTruthy()
    expect(onFinish).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: '  Draft  ' } })
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }))
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith({ name: 'Draft' }))
  })
})
