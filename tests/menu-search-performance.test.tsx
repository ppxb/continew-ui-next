// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SEARCH_DEBOUNCE_MS } from '@/hooks/use-debounced-value'
import { getMenuTree } from '@/lib/api/menu'
import type * as MenuApi from '@/lib/api/menu'
import type { MenuResp } from '@/lib/api/menu'
import { MenuList } from '@/routes/(main)/(app)/system/menu/-components/menu-list'
import { installBrowserAnimationApis } from './browser-apis'

vi.mock('@/lib/api/menu', async importOriginal => ({
  ...await importOriginal<typeof MenuApi>(),
  getMenuTree: vi.fn(),
  clearMenuCache: vi.fn()
}))
vi.mock('@/hooks/use-permission', () => ({ usePermission: () => ({ hasPermission: () => false }) }))
vi.mock('@/routes/(main)/(app)/system/menu/-components/menu-form-drawer', () => ({ MenuFormDrawer: () => null }))
vi.mock('@/routes/(main)/(app)/system/menu/-components/menu-delete-dialog', () => ({ MenuDeleteDialog: () => null }))

function menu(id: string, title: string, overrides: Partial<MenuResp> = {}): MenuResp {
  return {
    id, title, parentId: null, type: 2, path: null, name: null, component: null,
    redirect: null, icon: null, isExternal: false, isCache: false, isHidden: false,
    permission: null, sort: 1, status: 1, ...overrides
  }
}

// 156 total nodes make an accidental expand-all on clear observable through the real table.
const MENU_TREE: MenuResp[] = [
  menu('operations', 'Operations', { type: 1, children: [
    menu('users', 'User group', { parentId: 'operations', type: 1, children: [
      menu('target', 'Target user', { parentId: 'users' }),
      menu('account', 'Account sibling', { parentId: 'users' })
    ] })
  ] }),
  menu('manual', 'Manual branch', { type: 1, children: [
    menu('manual-child', 'Manual child', { parentId: 'manual' })
  ] }),
  menu('reports', 'Reports', { type: 1, children: [
    menu('daily', 'Daily view', { parentId: 'reports', path: '/reports/daily' }),
    menu('export', 'Export action', { parentId: 'reports', type: 3, permission: 'report:export' })
  ] }),
  menu('filler', 'Other menus', { type: 1, children: Array.from({ length: 146 }, (_, index) =>
    menu(`filler-${index}`, `Other action ${index}`, { parentId: 'filler', type: 3, permission: `other:action-${index}` }))
  })
]
const ROOT_TITLES = ['Operations', 'Manual branch', 'Reports', 'Other menus']
let client: QueryClient | undefined
let restoreAnimationApis: () => void

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getMenuTree).mockResolvedValue(MENU_TREE)
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0))
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => clearTimeout(handle))
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
    dispatchEvent: () => false
  }))
  restoreAnimationApis = installBrowserAnimationApis()
})

afterEach(() => {
  cleanup()
  client?.clear()
  client = undefined
  vi.clearAllTimers()
  vi.useRealTimers()
  restoreAnimationApis()
  vi.unstubAllGlobals()
})

async function mountMenu() {
  client = new QueryClient({ defaultOptions: { queries: {
    retry: false, gcTime: Infinity, staleTime: 5 * 60 * 1000,
    refetchOnMount: false, refetchOnWindowFocus: false, refetchOnReconnect: false
  } } })
  render(<QueryClientProvider client={client}><MenuList /></QueryClientProvider>)
  await screen.findByText('Operations')
  // Let the real query settle first, then control only the search and animation timers.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldClearNativeTimers: true })
  return screen.getByPlaceholderText('搜索名称、路由、权限') as HTMLInputElement
}

async function advance(milliseconds = SEARCH_DEBOUNCE_MS) {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds) })
}

function expansionButton(title: string, expanded: boolean) {
  const row = screen.getByText(title).closest('tr')!
  return within(row).getByRole('button', { name: expanded ? '收起子级' : '展开子级' })
}

function expectRows(count: number) {
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(count + 1)
}

function expectCollapsedRoots() {
  ROOT_TITLES.forEach(title => expect(screen.getByText(title)).toBeTruthy())
  expect(screen.queryByText('User group')).toBeNull()
  expect(screen.queryByText('Manual child')).toBeNull()
  expect(screen.queryByText('Daily view')).toBeNull()
  expect(screen.queryByText('Other action 0')).toBeNull()
  expectRows(4)
}

describe('MenuList debounced tree search', () => {
  it.each([
    { field: 'name', keyword: '  TARGET USER  ', leaf: 'Target user', ancestors: ['Operations', 'User group'], rowCount: 3 },
    { field: 'path', keyword: '/REPORTS/DAILY', leaf: 'Daily view', ancestors: ['Reports'], rowCount: 2 },
    { field: 'permission', keyword: 'REPORT:EXPORT', leaf: 'Export action', ancestors: ['Reports'], rowCount: 2 }
  ])('retains the matching $field child and expands every ancestor', async ({ keyword, leaf, ancestors, rowCount }) => {
    const input = await mountMenu()
    expectCollapsedRoots()
    fireEvent.change(input, { target: { value: keyword } })
    expect(input.value).toBe(keyword)
    await advance()
    expect(screen.getByText(leaf)).toBeTruthy()
    ancestors.forEach(title => expect(expansionButton(title, true).getAttribute('aria-expanded')).toBe('true'))
    expect(screen.queryByText('Account sibling')).toBeNull()
    expect(screen.queryByText('Other menus')).toBeNull()
    expectRows(rowCount)
    expect(getMenuTree).toHaveBeenCalledTimes(1)
  })

  it.each(['clear button', 'typed backspace'] as const)('restores manual expansion after clearing with $0', async method => {
    const input = await mountMenu()
    fireEvent.click(expansionButton('Manual branch', false))
    expect(screen.getByText('Manual child')).toBeTruthy()
    expectRows(5)
    fireEvent.change(input, { target: { value: 'Target user' } })
    await advance()
    expect(screen.getByText('Target user')).toBeTruthy()

    // Search results can still be collapsed and reopened without altering the saved manual view.
    fireEvent.click(expansionButton('User group', true))
    expect(screen.queryByText('Target user')).toBeNull()
    fireEvent.click(expansionButton('User group', false))
    expect(screen.getByText('Target user')).toBeTruthy()

    if (method === 'clear button') fireEvent.click(screen.getByRole('button', { name: '清空搜索' }))
    else {
      fireEvent.change(input, { target: { value: '' } })
      expect(input.value).toBe('')
      await advance()
    }
    expect(input.value).toBe('')
    ROOT_TITLES.forEach(title => expect(screen.getByText(title)).toBeTruthy())
    expect(screen.getByText('Manual child')).toBeTruthy()
    expect(expansionButton('Manual branch', true).getAttribute('aria-expanded')).toBe('true')
    expect(expansionButton('Operations', false).getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText('User group')).toBeNull()
    expect(screen.queryByText('Target user')).toBeNull()
    expect(screen.queryByText('Other action 0')).toBeNull()
    expectRows(5)
    await advance()
    expectRows(5)
    expect(getMenuTree).toHaveBeenCalledTimes(1)
  })

  it('updates input immediately, defers filtering, and applies only the final keyword', async () => {
    const input = await mountMenu()
    fireEvent.change(input, { target: { value: 'Target user' } })
    expect(input.value).toBe('Target user')
    await advance(SEARCH_DEBOUNCE_MS - 1)
    expectCollapsedRoots()

    fireEvent.change(input, { target: { value: '/reports/daily' } })
    expect(input.value).toBe('/reports/daily')
    await advance(SEARCH_DEBOUNCE_MS - 1)
    expectCollapsedRoots()
    await advance(1)
    expect(screen.getByText('Reports')).toBeTruthy()
    expect(screen.getByText('Daily view')).toBeTruthy()
    expect(screen.queryByText('Operations')).toBeNull()
    expect(screen.queryByText('Target user')).toBeNull()
    expectRows(2)
    await advance()
    expect(input.value).toBe('/reports/daily')
    expectRows(2)
    expect(getMenuTree).toHaveBeenCalledTimes(1)
  })

  it('cancels a pending keyword when the clear button restores collapsed roots', async () => {
    const input = await mountMenu()
    fireEvent.change(input, { target: { value: 'Target user' } })
    await advance()
    expect(screen.getByText('Target user')).toBeTruthy()
    fireEvent.change(input, { target: { value: '/reports/daily' } })
    await advance(SEARCH_DEBOUNCE_MS - 1)
    expect(screen.getByText('Target user')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '清空搜索' }))
    expect(input.value).toBe('')
    expectCollapsedRoots()
    await advance(SEARCH_DEBOUNCE_MS * 2)
    expectCollapsedRoots()
    expect(getMenuTree).toHaveBeenCalledTimes(1)
  })
})
