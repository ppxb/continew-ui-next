// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BetaSchemaForm } from '@/components/pro/form/beta-schema-form'
import { packageColumns, type PackageRecord } from '@/routes/(main)/(app)/tenant/package/-components/package-columns'
import { completePackageMenuIds } from '@/routes/(main)/(app)/tenant/package/-components/package-menu-values'

vi.mock('@/lib/http', () => ({ reportError: vi.fn() }))

let client: QueryClient | undefined

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0))
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle))
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }))
})

afterEach(() => {
  cleanup()
  client?.clear()
  vi.unstubAllGlobals()
})

describe('package menu submission', () => {
  it('reports empty menus alongside other invalid fields before invoking the save callback', async () => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    const onFinish = vi.fn(async () => false)
    render(
      <QueryClientProvider client={client}>
        <BetaSchemaForm<PackageRecord, typeof packageColumns> columns={packageColumns} onFinish={onFinish} />
      </QueryClientProvider>
    )
    fireEvent.click(await screen.findByRole('button', { name: '提交' }))
    expect(await screen.findByText('请输入名称')).toBeTruthy()
    expect(await screen.findByText('请选择关联菜单')).toBeTruthy()
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('completes ancestors without rounding snowflake ids or changing raw numeric ids', () => {
    const root = '9223372036854775806'
    const leaf = '9223372036854775807'
    const result = completePackageMenuIds(
      [leaf, '8', leaf, 'unknown'],
      new Map([[leaf, [root, '8']], ['8', [root]]]),
      [{ key: root, parentId: null, title: 'Root', children: [
        { key: 8, parentId: root, title: 'Parent', children: [{ key: leaf, parentId: 8, title: 'Leaf' }] }
      ] }]
    )
    expect(result).toEqual([leaf, 8, 'unknown', root])
  })
})
