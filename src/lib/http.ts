import { toast } from '@/components/ui/toast'

import type { ApiResponse, LoginResp } from './api/types'
import {
  clearSession,
  getAccessToken,
  getAuthGeneration,
  getTenantId,
  setAccessToken,
  setTenantId
} from './auth-session'

/**
 * HTTP layer for the continew-admin API.
 *
 * Mirrors the official Vue client: the access token travels in the Authorization
 * header, the refresh token stays in the backend's HttpOnly cookie (so every
 * request is sent with credentials), a business failure arrives as HTTP 200 with
 * `success: false`, and an expired access token arrives as HTTP 401.
 */
const API_PREFIX = import.meta.env.VITE_API_PREFIX
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const BASE_URL = (API_PREFIX || API_BASE_URL).replace(/\/+$/, '')
const REQUEST_TIMEOUT_MS = 30_000

const LOGIN_PATH = '/auth/login'
const REFRESH_PATH = '/auth/refresh'
const LOGOUT_PATH = '/auth/logout'

const STATUS_MESSAGE: Record<number, string> = {
  400: '请求错误（400）',
  403: '拒绝访问（403）',
  404: '请求出错（404）',
  408: '请求超时（408）',
  500: '服务器错误（500）',
  502: '网络错误（502）',
  503: '服务不可用（503）',
  504: '网络超时（504）'
}

export class ApiError extends Error {
  readonly code?: string
  readonly status?: number

  constructor(message: string, options: { code?: string; status?: number } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = options.code
    this.status = options.status
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  /** JSON body, serialized automatically. */
  body?: unknown
  /** Query parameters; null and undefined values are skipped. */
  query?: Record<string, string | number | boolean | null | undefined>
  /** Skip the refresh-and-retry flow when the request answers 401. */
  skipAuthRefresh?: boolean
  /** Let the caller handle the failure instead of showing a toast. */
  silent?: boolean
}

type SessionExpiredHandler = (message: string) => void

let sessionExpiredHandler: SessionExpiredHandler | null = null
let sessionExpiredNotified = false
let refreshPromise: Promise<string> | null = null

/** Registers the callback used once the session can no longer be recovered. */
export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  sessionExpiredHandler = handler
}

function notifyError(message: string) {
  toast.add({ title: message, type: 'error' })
}

function fail(message: string, options: { code?: string; status?: number } = {}, silent = false) {
  if (!silent) {
    notifyError(message)
  }

  return new ApiError(message, options)
}

/** Auth endpoints must not carry the tenant header. */
function isTenantIndependentPath(path: string) {
  return path === LOGIN_PATH || path === REFRESH_PATH || path === LOGOUT_PATH
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = `${BASE_URL}${path}`

  if (!query) {
    return url
  }

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      continue
    }
    search.set(key, String(value))
  }

  const queryString = search.toString()
  return queryString ? `${url}?${queryString}` : url
}

function buildHeaders(path: string, hasBody: boolean, extra?: HeadersInit) {
  const headers = new Headers(extra)

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const accessToken = getAccessToken()
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const tenantId = getTenantId()
  if (tenantId && !isTenantIndependentPath(path)) {
    headers.set('X-Tenant-Id', tenantId)
  }

  return headers
}

async function readPayload<T>(response: Response): Promise<ApiResponse<T> | null> {
  return (await response.json().catch(() => null)) as ApiResponse<T> | null
}

async function performRefresh(): Promise<string> {
  const response = await fetch(buildUrl(REFRESH_PATH), {
    method: 'POST',
    credentials: 'include',
    headers: buildHeaders(REFRESH_PATH, false),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })
  const payload = await readPayload<LoginResp>(response)
  const accessToken = payload?.data?.accessToken

  if (!response.ok || !payload?.success || !accessToken) {
    throw new ApiError(payload?.msg || '登录状态已失效，请重新登录', { status: response.status })
  }

  setAccessToken(accessToken)
  setTenantId(payload.data.tenantId ?? null)
  return accessToken
}

/** Single-flight refresh so concurrent 401s cannot rotate the token twice. */
function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

async function handleSessionExpired(failedGeneration: number, message: string) {
  if (failedGeneration !== getAuthGeneration() || sessionExpiredNotified) {
    return
  }

  sessionExpiredNotified = true
  clearSession()

  // Ask the backend to drop the HttpOnly refresh cookie; a failure is not fatal.
  try {
    await fetch(buildUrl(LOGOUT_PATH), {
      method: 'POST',
      credentials: 'include',
      headers: buildHeaders(LOGOUT_PATH, false)
    })
  } catch {
    // Ignore: the local session is already cleared.
  }

  sessionExpiredHandler?.(message)
}

async function send<T>(method: string, path: string, options: RequestOptions, isRetry: boolean): Promise<T> {
  const { body, query, skipAuthRefresh, silent, headers, ...init } = options
  const generation = getAuthGeneration()

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      method,
      credentials: 'include',
      headers: buildHeaders(path, body !== undefined, headers),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch {
    throw fail('网络连接失败，请检查您的网络', {}, silent)
  }

  if (response.status === 401) {
    if (skipAuthRefresh || path === REFRESH_PATH || isRetry) {
      const payload = await readPayload<T>(response)
      const message = payload?.msg || '登录状态已失效，请重新登录'
      await handleSessionExpired(generation, message)
      throw fail(message, { status: 401 }, silent)
    }

    try {
      await refreshAccessToken()
    } catch (error) {
      const message = error instanceof ApiError ? error.message : '登录状态已失效，请重新登录'
      await handleSessionExpired(generation, message)
      throw error
    }

    return send<T>(method, path, options, true)
  }

  const payload = await readPayload<T>(response)
  const message = payload?.msg || STATUS_MESSAGE[response.status] || `请求失败（${response.status}）`

  if (!payload) {
    throw fail(message, { status: response.status }, silent)
  }

  if (!payload.success) {
    throw fail(message, { code: payload.code, status: response.status }, silent)
  }

  if (path === LOGIN_PATH) {
    sessionExpiredNotified = false
  }

  return payload.data
}

export function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  return send<T>(method, path, options, false)
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, { ...options, body }),
  del: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options)
}
