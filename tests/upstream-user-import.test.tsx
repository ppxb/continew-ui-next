// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserImportParseResp } from '@/lib/api/user'
import { UserImportDrawer } from '@/routes/(main)/(app)/system/user/-components/user-import-drawer'
import { installBrowserAnimationApis } from './browser-apis'

const requests = vi.hoisted(() => ({ post: vi.fn(), downloadFile: vi.fn(), reportError: vi.fn(), toast: vi.fn() }))
vi.mock('@/lib/http', () => ({
  http: { post: requests.post },
  downloadFile: requests.downloadFile,
  reportError: requests.reportError
}))
vi.mock('@/components/ui/toast', () => ({ toast: { add: requests.toast } }))

const parsed: UserImportParseResp = {
  importKey: 'parsed-workbook-key',
  totalRows: 8,
  validRows: 6,
  duplicateUserRows: 2,
  duplicateEmailRows: 1,
  duplicatePhoneRows: 3
}
const clients: QueryClient[] = []
let restoreAnimations: () => void

beforeEach(() => {
  vi.clearAllMocks()
  requests.post.mockReset()
  requests.downloadFile.mockResolvedValue(undefined)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
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

function renderDrawer() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  clients.push(client)
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <UserImportDrawer open onClose={onClose} />
    </QueryClientProvider>
  )
  return { invalidate, onClose }
}

function upload(file = new File(['workbook bytes'], 'users.xlsx')) {
  fireEvent.change(screen.getByLabelText('Excel 文件'), { target: { files: [file] } })
}

async function selectOption(label: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name: label }))
  const item = await screen.findByRole('option', { name: option })
  fireEvent.pointerDown(item, { pointerType: 'mouse' })
  fireEvent.click(item)
  await waitFor(() => expect(screen.getByRole('combobox', { name: label }).textContent).toContain(option))
  await waitFor(() => expect(screen.queryByRole('option', { name: option })).toBeNull())
}

describe('upstream user import', () => {
  it('rejects unsupported and empty workbooks without starting a backend parse', () => {
    renderDrawer()
    upload(new File(['not a workbook'], 'users.csv'))
    upload(new File([], 'users.xlsx'))
    expect(requests.post).not.toHaveBeenCalled()
    expect(requests.toast).toHaveBeenCalledWith({ title: '请选择 Excel 文件（.xlsx / .xls）', type: 'error' })
    expect(requests.toast).toHaveBeenCalledWith({ title: '文件不能为空', type: 'error' })
    expect((screen.getByRole('button', { name: '开始导入' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('downloads the real template and reports download failures', async () => {
    const error = new Error('Template unavailable')
    requests.downloadFile.mockRejectedValueOnce(error)
    renderDrawer()
    fireEvent.click(screen.getByRole('button', { name: '下载模板' }))
    await waitFor(() => expect(requests.downloadFile).toHaveBeenCalledWith('/system/user/import/template'))
    await waitFor(() => expect(requests.reportError).toHaveBeenCalledWith(error, '模板下载失败'))
  })

  it('locks parsing, overlays the counts and TTL, and submits every selected policy once', async () => {
    const parseRequest = Promise.withResolvers<UserImportParseResp>()
    const importRequest = Promise.withResolvers<{ totalRows: number; insertRows: number; updateRows: number }>()
    requests.post.mockImplementation((path: string) =>
      path.endsWith('/parse') ? parseRequest.promise : importRequest.promise
    )
    const { invalidate, onClose } = renderDrawer()
    const workbook = new File(['workbook bytes'], 'USERS.XLSX')
    upload(workbook)
    upload(new File(['other workbook'], 'other.xlsx'))
    expect(requests.post).toHaveBeenCalledTimes(1)
    const [path, body] = requests.post.mock.calls[0]!
    expect(path).toBe('/system/user/import/parse')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(workbook)
    expect((screen.getByRole('button', { name: '取消' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '开始导入' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => parseRequest.resolve(parsed))
    expect(await screen.findByText('解析结果')).toBeTruthy()
    expect(screen.getByText('导入会话有效期为 10 分钟，过期后请重新上传。')).toBeTruthy()
    expect(screen.getByText('总计').parentElement?.textContent).toBe('总计8')
    expect(screen.getByText('有效').parentElement?.textContent).toBe('有效6')
    await selectOption('重复用户策略', '修改数据')
    await selectOption('重复邮箱策略', '停止导入')
    await selectOption('默认状态', '禁用')
    const importButton = screen.getByRole('button', { name: '开始导入' })
    fireEvent.click(importButton)
    fireEvent.click(importButton)
    await screen.findByRole('button', { name: '导入中' })
    expect(requests.post).toHaveBeenCalledTimes(2)
    expect(requests.post).toHaveBeenLastCalledWith('/system/user/import', {
      importKey: parsed.importKey,
      duplicateUser: 2,
      duplicateEmail: 3,
      duplicatePhone: 1,
      defaultStatus: 2
    })
    expect((screen.getByRole('button', { name: '重新上传' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => importRequest.resolve({ totalRows: 6, insertRows: 2, updateRows: 1 }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['system', 'user', 'list'] })
    expect(requests.toast).toHaveBeenCalledWith({ title: '导入完成：总计 6 条，新增 2 条，修改 1 条', type: 'success' })
  })

  it('allows another upload after a parse error without showing a success result', async () => {
    const error = new Error('数据文件格式不正确')
    requests.post.mockRejectedValueOnce(error).mockResolvedValueOnce(parsed)
    renderDrawer()
    upload()
    await waitFor(() => expect(requests.reportError).toHaveBeenCalledWith(error, '文件解析失败，请重新上传'))
    expect(screen.queryByText('解析结果')).toBeNull()
    expect((screen.getByRole('button', { name: '开始导入' }) as HTMLButtonElement).disabled).toBe(true)
    upload()
    expect(await screen.findByText('解析结果')).toBeTruthy()
    expect(requests.post).toHaveBeenCalledTimes(2)
  })

  it('discards an expired import key and requires a new successful parse', async () => {
    const expired = new Error('导入已过期，请重新上传')
    requests.post
      .mockResolvedValueOnce(parsed)
      .mockRejectedValueOnce(expired)
      .mockResolvedValueOnce({ ...parsed, importKey: 'replacement-key' })
    const { invalidate, onClose } = renderDrawer()
    upload()
    await screen.findByText('解析结果')
    fireEvent.click(screen.getByRole('button', { name: '开始导入' }))
    await waitFor(() => expect(screen.queryByText('解析结果')).toBeNull())
    expect((screen.getByRole('button', { name: '开始导入' }) as HTMLButtonElement).disabled).toBe(true)
    expect(requests.reportError).toHaveBeenCalledWith(expired, '导入失败，请重试')
    expect(invalidate).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    upload()
    expect(await screen.findByText('解析结果')).toBeTruthy()
    expect(requests.post).toHaveBeenCalledTimes(3)
  })

  it('keeps a non-expired import failure retryable but blocks imports without valid rows', async () => {
    const error = new Error('数据不符合导入策略，已退出导入')
    requests.post
      .mockResolvedValueOnce(parsed)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ ...parsed, validRows: 0 })
    const { invalidate, onClose } = renderDrawer()
    upload()
    await screen.findByText('解析结果')
    fireEvent.click(screen.getByRole('button', { name: '开始导入' }))
    await waitFor(() => expect(requests.reportError).toHaveBeenCalledWith(error, '导入失败，请重试'))
    expect(screen.getByText('解析结果')).toBeTruthy()
    expect((screen.getByRole('button', { name: '开始导入' }) as HTMLButtonElement).disabled).toBe(false)
    expect(invalidate).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '重新上传' }))
    upload()
    await screen.findByText('解析结果')
    expect((screen.getByRole('button', { name: '开始导入' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '开始导入' }))
    expect(requests.post).toHaveBeenCalledTimes(3)
  })
})
