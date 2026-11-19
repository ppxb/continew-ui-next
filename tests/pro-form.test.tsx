// @vitest-environment jsdom

import { createRef, useCallback, useState, type ReactElement } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { ProDescriptions } from '@/components/pro/descriptions/pro-descriptions'
import { BetaSchemaForm } from '@/components/pro/form/beta-schema-form'
import type { ProColumns, ProFormInstance, ProValues } from '@/components/pro/typing'
import { reportError } from '@/lib/http'

vi.mock('@/lib/http', () => ({ reportError: vi.fn() }))

const clients: QueryClient[] = []

function mount(
  element: ReactElement,
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
) {
  clients.push(client)
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { ...render(element, { wrapper }), client }
}

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0))
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle))
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
})

afterEach(() => {
  cleanup()
  for (const client of clients.splice(0)) client.clear()
  vi.unstubAllGlobals()
})

describe('BetaSchemaForm', () => {
  it('keeps callback refs stable while their parent stores the live form instance in state', async () => {
    const columns = [
      { dataIndex: 'name', title: 'Name', initialValue: 'Initial', formItemProps: { rules: z.string().trim() } }
    ] as const satisfies readonly ProColumns<ProValues>[]
    const received = vi.fn<(value: ProFormInstance | undefined | null) => void>()
    const onFinish = vi.fn(async () => false)
    function Host() {
      const [api, setApi] = useState<ProFormInstance | undefined>()
      const formRef = useCallback((value: ProFormInstance | undefined | null) => {
        received(value)
        setApi(value ?? undefined)
      }, [])
      return (
        <>
          <BetaSchemaForm columns={columns} formRef={formRef} onFinish={onFinish} />
          <output>{api ? 'Form ready' : 'Waiting'}</output>
        </>
      )
    }
    const { rerender } = mount(<Host />)
    expect(await screen.findByText('Form ready')).toBeTruthy()
    expect(received).toHaveBeenCalledTimes(1)
    const api = received.mock.calls[0]?.[0]
    change('Name', 'Typed')
    rerender(<Host />)
    expect(received).toHaveBeenCalledTimes(1)
    expect(api?.getFieldValue('name')).toBe('Typed')
    act(() => api?.setFieldsValue({ name: '  Updated  ' }))
    expect(api?.getFieldsFormatValue()).toEqual({ name: 'Updated' })
    act(() => api?.submit())
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith({ name: 'Updated' }))
    act(() => api?.resetFields())
    expect(api?.getFieldValue('name')).toBe('Initial')
    expect(received).toHaveBeenCalledTimes(1)
  })

  it('marks defaulted required text from its empty type value while honoring explicit required overrides', async () => {
    const columns = [
      { dataIndex: 'name', title: 'Name', initialValue: 'Filled', formItemProps: { rules: z.string().min(1) } },
      {
        dataIndex: 'optional',
        title: 'Optional',
        initialValue: 'Filled',
        formItemProps: { required: false, rules: z.string().min(1) }
      },
      {
        dataIndex: 'status',
        title: 'Status',
        valueType: 'switch',
        initialValue: 1,
        formItemProps: { rules: z.number() }
      }
    ] as const satisfies readonly ProColumns<ProValues>[]
    mount(<BetaSchemaForm columns={columns} onFinish={async () => false} />)
    const name = (await screen.findByLabelText('Name', { exact: false })) as HTMLInputElement
    const optional = screen.getByLabelText('Optional') as HTMLInputElement
    const statusLabel = screen.getByText('Status', { selector: 'label' })
    expect(name.labels?.[0]?.textContent).toContain('*')
    expect(optional.labels?.[0]?.textContent).not.toContain('*')
    expect(statusLabel.textContent).not.toContain('*')
  })

  it('submits untouched object and function configured multiple selects as empty arrays', async () => {
    const columns = [
      { dataIndex: 'enabled', title: 'Enabled', initialValue: 'yes' },
      {
        dataIndex: 'roles',
        title: 'Roles',
        valueType: 'select',
        valueEnum: { admin: 'Admin' },
        fieldProps: { mode: 'multiple' },
        formItemProps: { rules: z.array(z.string()) }
      },
      {
        dataIndex: 'teams',
        title: 'Teams',
        valueType: 'select',
        valueEnum: { team: 'Team' },
        fieldProps: form => ({ mode: form?.getFieldValue('enabled') === 'yes' ? 'multiple' : undefined }),
        formItemProps: { rules: z.array(z.string()) }
      }
    ] as const satisfies readonly ProColumns<ProValues>[]
    const onFinish = vi.fn(async () => false)
    const ref = createRef<ProFormInstance | undefined>()
    mount(<BetaSchemaForm columns={columns} formRef={ref} onFinish={onFinish} />)
    await screen.findByRole('button', { name: '提交' })
    expect(ref.current?.getFieldsValue()).toEqual({ enabled: 'yes', roles: [], teams: [] })
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith({ enabled: 'yes', roles: [], teams: [] }))
  })

  it('submits parsed transforms, retains unruled active fields, and omits hidden fields', async () => {
    const columns = [
      {
        dataIndex: 'name',
        title: 'Name',
        formItemProps: {
          rules: z
            .string()
            .trim()
            .min(1)
            .transform(value => value.length)
        }
      },
      { dataIndex: 'note', title: 'Note' },
      { dataIndex: 'password', title: 'Password', hideInForm: true }
    ] as const satisfies readonly ProColumns<ProValues>[]
    const onFinish = vi.fn(async () => false)
    const ref = createRef<ProFormInstance | undefined>()
    mount(
      <BetaSchemaForm columns={columns} initialValues={{ password: 'private' }} formRef={ref} onFinish={onFinish} />
    )
    change('Name', '  Ada  ')
    change('Note', 'Keep this')
    expect(ref.current?.getFieldsFormatValue()).toEqual({ name: 3, note: 'Keep this' })
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith({ name: 3, note: 'Keep this' }))
    expect(screen.queryByLabelText('Password')).toBeNull()
  })

  it('validates all empty fields together and focuses the first invalid control', async () => {
    const columns = [
      {
        dataIndex: 'first',
        title: 'First',
        formItemProps: { required: false, rules: z.string().min(1, 'First required') }
      },
      {
        dataIndex: 'second',
        title: 'Second',
        formItemProps: { required: false, rules: z.string().min(1, 'Second required') }
      }
    ] as const satisfies readonly ProColumns<ProValues>[]
    const onFinish = vi.fn(async () => false)
    const ref = createRef<ProFormInstance | undefined>()
    mount(<BetaSchemaForm columns={columns} formRef={ref} onFinish={onFinish} />)
    expect(() => ref.current?.getFieldsFormatValue()).toThrow()
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    expect(await screen.findByText('First required')).toBeTruthy()
    expect(await screen.findByText('Second required')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('First')))
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('includes conditional required rules and transforms, then drops disappearing values', async () => {
    const columns = [
      { dataIndex: 'kind', title: 'Kind', initialValue: 'yes' },
      {
        valueType: 'dependency',
        name: ['kind'],
        columns: ({ kind }: Partial<ProValues>) =>
          kind === 'yes'
            ? [
                {
                  dataIndex: 'secret',
                  title: 'Secret',
                  formItemProps: () => ({
                    required: false,
                    rules: z
                      .string()
                      .trim()
                      .min(1, 'Secret required')
                      .transform(value => value.toUpperCase())
                  })
                }
              ]
            : []
      }
    ] as const satisfies readonly ProColumns<ProValues>[]
    const onFinish = vi.fn(async () => false)
    mount(<BetaSchemaForm columns={columns} onFinish={onFinish} />)
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    expect(await screen.findByText('Secret required')).toBeTruthy()
    expect(onFinish).not.toHaveBeenCalled()
    change('Secret', '  abc  ')
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith({ kind: 'yes', secret: 'ABC' }))
    change('Kind', 'no')
    await waitFor(() => expect(screen.queryByLabelText('Secret')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await waitFor(() => expect(onFinish).toHaveBeenLastCalledWith({ kind: 'no' }))
  })

  it('fills create and changing edit records without clobbering typing on background refresh or inline config changes', async () => {
    const columns = [
      { dataIndex: 'name', title: 'Name', initialValue: 'New' }
    ] as const satisfies readonly ProColumns<ProValues>[]
    const onFinish = vi.fn(async () => false)
    const request = vi.fn(async ({ id }: { id: number }) => ({ name: id === 1 ? 'One' : 'Two' }))
    const { rerender, client } = mount(<BetaSchemaForm columns={columns} onFinish={onFinish} />)
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('New')
    rerender(
      <BetaSchemaForm
        columns={[...columns]}
        request={request}
        params={{ id: 1 }}
        queryKey={['form-record']}
        onFinish={onFinish}
      />
    )
    await waitFor(() => expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('One'))
    change('Name', 'Draft')
    rerender(
      <BetaSchemaForm
        columns={[...columns]}
        request={request}
        params={{ id: 1 }}
        queryKey={['form-record']}
        initialValues={{ name: 'Another default' }}
        onFinish={onFinish}
      />
    )
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Draft')
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['form-record'] })
    })
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Draft')
    rerender(
      <BetaSchemaForm
        columns={columns}
        request={request}
        params={{ id: 2 }}
        queryKey={['form-record']}
        onFinish={onFinish}
      />
    )
    await waitFor(() => expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Two'))
    rerender(<BetaSchemaForm columns={columns} onFinish={onFinish} />)
    await waitFor(() => expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('New'))
  })

  it('reports a rejected finish without closing the drawer', async () => {
    const failure = new Error('Save failed')
    const onFinish = vi.fn(async () => {
      throw failure
    })
    const onOpenChange = vi.fn()
    mount(
      <BetaSchemaForm
        columns={[{ dataIndex: 'name', title: 'Name' }]}
        layoutType="DrawerForm"
        title="Edit"
        open
        onOpenChange={onOpenChange}
        onFinish={onFinish}
      />
    )
    fireEvent.click(await screen.findByRole('button', { name: '保存' }))
    await waitFor(() => expect(reportError).toHaveBeenCalledWith(failure))
    expect(onOpenChange).not.toHaveBeenCalled()
    await waitFor(() =>
      expect((screen.getByRole('button', { name: '保存' }) as HTMLButtonElement).disabled).toBe(false)
    )
  })

  it('blocks close and duplicate submission while pending, then closes only on a truthy finish', async () => {
    const pending = Promise.withResolvers<boolean>()
    const onFinish = vi.fn(() => pending.promise)
    const onOpenChange = vi.fn()
    const ref = createRef<ProFormInstance | undefined>()
    mount(
      <BetaSchemaForm
        columns={[{ dataIndex: 'name', title: 'Name' }]}
        formRef={ref}
        layoutType="DrawerForm"
        title="Edit"
        open
        onOpenChange={onOpenChange}
        onFinish={onFinish}
      />
    )
    await screen.findByRole('button', { name: '保存' })
    act(() => {
      ref.current?.submit()
      ref.current?.submit()
    })
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
    const closeButton = screen.getByRole('button', { name: '关闭' }) as HTMLButtonElement
    expect(closeButton.disabled).toBe(true)
    fireEvent.click(closeButton)
    fireEvent.keyDown(document.body, { key: 'Escape' })
    const backdrop = document.querySelector('[data-slot="drawer-overlay"]')!
    expect(backdrop).not.toBeNull()
    fireEvent.pointerDown(backdrop)
    fireEvent.click(backdrop)
    expect(onOpenChange).not.toHaveBeenCalled()
    await act(async () => {
      pending.resolve(true)
      await pending.promise
    })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('refreshes cached data on every drawer reopen and applies null fallbacks and convertValue', async () => {
    const columns = [
      { dataIndex: 'name', title: 'Name' },
      { dataIndex: 'code', title: 'Code', convertValue: (value: unknown) => String(value ?? '') }
    ] as const satisfies readonly ProColumns<ProValues>[]
    const onFinish = vi.fn(async () => false)
    const onOpenChange = vi.fn()
    let version = 1
    const request = vi.fn(async () => ({ name: version === 1 ? 'First' : null, code: version }))
    const element = (open: boolean) => (
      <BetaSchemaForm
        columns={columns}
        request={request}
        queryKey={['reopen']}
        layoutType="DrawerForm"
        title="Edit"
        open={open}
        onOpenChange={onOpenChange}
        onFinish={onFinish}
      />
    )
    const { rerender } = mount(element(true))
    await waitFor(() => expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('First'))
    change('Name', 'Unsaved')
    rerender(element(false))
    version = 2
    rerender(element(true))
    await waitFor(() => expect((screen.getByLabelText('Code') as HTMLInputElement).value).toBe('2'))
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('')
    expect(request).toHaveBeenCalledTimes(2)
  })
})

describe('ProDescriptions', () => {
  it('caches the raw entity and does not show a previous record on a key switch', async () => {
    const columns = [{ dataIndex: 'name', title: 'Name' }] as const satisfies readonly ProColumns<ProValues>[]
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    const request = vi.fn(async () => ({ data: { name: 'One' }, success: true }))
    const { rerender } = mount(<ProDescriptions columns={columns} queryKey={['shared', 1]} request={request} />, client)
    expect(await screen.findByText('One')).toBeTruthy()
    expect(client.getQueryData(['shared', 1])).toEqual({ name: 'One' })
    const next = Promise.withResolvers<{ data: ProValues }>()
    rerender(<ProDescriptions columns={columns} queryKey={['shared', 2]} request={() => next.promise} />)
    expect(screen.queryByText('One')).toBeNull()
    await act(async () => {
      next.resolve({ data: { name: 'Two' } })
      await next.promise
    })
    expect(await screen.findByText('Two')).toBeTruthy()
    rerender(<ProDescriptions columns={columns} emptyText="Choose a record" />)
    expect(screen.getByText('Choose a record')).toBeTruthy()
    expect(screen.queryByText('数据加载失败')).toBeNull()
  })
})
