// @vitest-environment jsdom

import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearSession, getAccessToken, getTenantId } from '@/lib/auth-session'
import { optionKeys, siteOptionKeys } from '@/lib/query-keys'
import { createAuthStore } from '@/stores/auth/auth-store'
import { useOptionForm, type OptionMap } from '@/routes/(main)/(app)/system/config/-components/use-option-form'

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  socialLogin: vi.fn(),
  logout: vi.fn(),
  getUserInfo: vi.fn(),
  encrypt: vi.fn(),
  listOption: vi.fn(),
  updateOption: vi.fn(),
  resetOptionValue: vi.fn(),
  toast: vi.fn(),
  reportError: vi.fn()
}))

vi.mock('@/lib/api/auth', () => ({
  login: mocks.login,
  socialLogin: mocks.socialLogin,
  logout: mocks.logout,
  getUserInfo: mocks.getUserInfo
}))
vi.mock('@/lib/crypto', () => ({ encryptByRsa: mocks.encrypt }))
vi.mock('@/lib/api/option', () => ({
  listOption: mocks.listOption,
  updateOption: mocks.updateOption,
  resetOptionValue: mocks.resetOptionValue
}))
vi.mock('@/components/ui/toast', () => ({ toast: { add: mocks.toast } }))
vi.mock('@/lib/http', () => ({ reportError: mocks.reportError }))

const clients: QueryClient[] = []
const toForm = (options: OptionMap) => ({ SITE_TITLE: options.SITE_TITLE?.value ?? '' })

beforeEach(() => {
  vi.resetAllMocks()
  clearSession()
  mocks.login.mockResolvedValue({ accessToken: 'unit-account-token', tenantId: 7 })
  mocks.socialLogin.mockResolvedValue({ accessToken: 'unit-social-token', tenantId: 7 })
  mocks.getUserInfo.mockResolvedValue({ id: 1, username: 'unit-user', permissions: ['read'], roles: ['reader'] })
  mocks.encrypt.mockReturnValue('unit-encrypted-password')
  mocks.listOption.mockResolvedValue([{ id: 1, name: 'Site title', code: 'SITE_TITLE', value: 'Before' }])
  mocks.updateOption.mockResolvedValue(undefined)
  mocks.resetOptionValue.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
  clearSession()
  localStorage.clear()
  sessionStorage.clear()
})

async function renderOptions(category = 'SITE') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  clients.push(client)
  client.setQueryData(siteOptionKeys.all, { title: 'Before' })
  client.setQueryData([...siteOptionKeys.all, 'metadata'], { title: 'Before' })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  const hook = renderHook(() => useOptionForm({ category, toForm }), { wrapper })
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
  return { ...hook, client }
}

describe('upstream tenant login forwarding', () => {
  it('forwards the tenant separately while preserving encryption, captcha and remembered sessions', async () => {
    const store = createAuthStore()
    await store.getState().login({
      username: 'unit-user', password: 'unit-password', captcha: '1234', uuid: 'unit-captcha', persist: true, tenantCode: 'tenant-unit'
    })
    expect(mocks.encrypt).toHaveBeenCalledWith('unit-password')
    expect(mocks.login).toHaveBeenCalledWith(expect.objectContaining({
      authType: 'ACCOUNT', username: 'unit-user', password: 'unit-encrypted-password', captcha: '1234', uuid: 'unit-captcha'
    }), 'tenant-unit')
    expect(mocks.login.mock.calls[0][0]).not.toHaveProperty('tenantCode')
    expect(store.getState().status).toBe('authenticated')
    expect(getTenantId()).toBe('7')
    expect(localStorage.getItem('continew.access-token')).toBe('unit-account-token')
  })

  it('uses the default tenant when omitted and keeps an unremembered session out of localStorage', async () => {
    const store = createAuthStore()
    await store.getState().login({ username: 'unit-user', password: 'unit-password', persist: false })
    expect(mocks.login.mock.calls[0][1]).toBeUndefined()
    expect(localStorage.getItem('continew.access-token')).toBeNull()
    expect(sessionStorage.getItem('continew.access-token')).toBe('unit-account-token')
  })

  it('rejects failed authentication without establishing a session', async () => {
    mocks.login.mockRejectedValueOnce(new Error('Rejected account'))
    const store = createAuthStore()
    await expect(store.getState().login({ username: 'unit-user', password: 'unit-password', tenantCode: 'tenant-unit' })).rejects.toThrow('Rejected account')
    expect(mocks.getUserInfo).not.toHaveBeenCalled()
    expect(store.getState().status).toBe('anonymous')
    expect(getAccessToken()).toBeNull()
  })

  it.each(['account', 'social'] as const)('rejects %s login when profile loading fails and clears the new session', async method => {
    mocks.getUserInfo.mockRejectedValueOnce(new Error('Profile unavailable'))
    const store = createAuthStore()
    const login = method === 'account'
      ? store.getState().login({ username: 'unit-user', password: 'unit-password', tenantCode: 'tenant-unit' })
      : store.getState().socialLogin({ source: 'unit-provider', code: 'unit-code' })
    await expect(login).rejects.toThrow('Profile unavailable')
    expect(store.getState().status).toBe('anonymous')
    expect(getAccessToken()).toBeNull()
    expect(getTenantId()).toBeNull()
  })
})

describe('upstream site metadata refresh', () => {
  it('invalidates the public site prefix after saving SITE while preserving edit lifecycle and payload IDs', async () => {
    const { result, client } = await renderOptions()
    act(() => result.current.startEdit())
    expect(result.current.isEdit).toBe(true)
    await act(async () => { expect(await result.current.save({ SITE_TITLE: 'After' })).toBe(true) })
    expect(mocks.updateOption).toHaveBeenCalledWith([{ id: 1, code: 'SITE_TITLE', value: 'After' }])
    expect(result.current.isEdit).toBe(false)
    expect(client.getQueryState(siteOptionKeys.all)?.isInvalidated).toBe(true)
    expect(client.getQueryState([...siteOptionKeys.all, 'metadata'])?.isInvalidated).toBe(true)
    expect(client.getQueryData(optionKeys.list('SITE'))).toBeDefined()
  })

  it('invalidates public metadata when restoring SITE defaults and closes the reset dialog', async () => {
    const { result, client } = await renderOptions()
    act(() => {
      result.current.startEdit()
      result.current.setResetDialogOpen(true)
    })
    act(() => result.current.resetToDefault())
    await waitFor(() => expect(client.getQueryState(siteOptionKeys.all)?.isInvalidated).toBe(true))
    expect(mocks.resetOptionValue).toHaveBeenCalledWith({ category: 'SITE' })
    expect(result.current.resetDialogOpen).toBe(false)
    expect(result.current.isEdit).toBe(false)
  })

  it('does not invalidate SITE metadata for another option category', async () => {
    const { result, client } = await renderOptions('LOGIN')
    act(() => result.current.startEdit())
    await act(async () => { await result.current.save({ SITE_TITLE: 'After' }) })
    act(() => result.current.resetToDefault())
    await waitFor(() => expect(mocks.resetOptionValue).toHaveBeenCalledWith({ category: 'LOGIN' }))
    await waitFor(() => expect(result.current.isResetting).toBe(false))
    expect(client.getQueryState(siteOptionKeys.all)?.isInvalidated).toBe(false)
  })

  it('keeps an unsuccessful save in edit mode without invalidating public metadata', async () => {
    mocks.updateOption.mockRejectedValueOnce(new Error('Save rejected'))
    const { result, client } = await renderOptions()
    act(() => result.current.startEdit())
    await act(async () => { expect(await result.current.save({ SITE_TITLE: 'After' })).toBe(false) })
    expect(result.current.isEdit).toBe(true)
    expect(client.getQueryState(siteOptionKeys.all)?.isInvalidated).toBe(false)
    expect(mocks.reportError).toHaveBeenCalledOnce()
  })

  it('keeps an unsuccessful reset dialog open without invalidating public metadata', async () => {
    mocks.resetOptionValue.mockRejectedValueOnce(new Error('Reset rejected'))
    const { result, client } = await renderOptions()
    act(() => {
      result.current.startEdit()
      result.current.setResetDialogOpen(true)
    })
    act(() => result.current.resetToDefault())
    await waitFor(() => expect(mocks.reportError).toHaveBeenCalledOnce())
    expect(result.current.resetDialogOpen).toBe(true)
    expect(result.current.isEdit).toBe(true)
    expect(client.getQueryState(siteOptionKeys.all)?.isInvalidated).toBe(false)
  })
})
