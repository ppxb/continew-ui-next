// @vitest-environment jsdom
import { useRef, useState, type ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ProTable } from '@/components/pro/table/pro-table'
import { BetaSchemaForm } from '@/components/pro/form/beta-schema-form'
import { installBrowserAnimationApis } from './browser-apis'

const clients: QueryClient[] = []
let restoreAnimations: () => void
beforeEach(() => {
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
function mount(element: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  clients.push(client)
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>)
}

describe('rollout layout and submission contracts', () => {
  it('clears client filters that veto remote keyword submission', async () => {
    const rows = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]
    function Example() {
      const [keyword, setKeyword] = useState('')
      return (
        <ProTable
          columns={[{ dataIndex: 'name', title: 'Name' }]}
          dataSource={rows.filter(row => row.name.includes(keyword))}
          rowKey="id"
          queryKey={['veto-clear']}
          params={{ keyword }}
          options={{
            setting: false,
            fullScreen: false,
            reload: false,
            search: {
              delay: 0,
              placeholder: 'Filter locally',
              onSearch: value => {
                setKeyword(value)
                return false
              }
            }
          }}
        />
      )
    }
    mount(<Example />)
    await screen.findByText('Alice')
    fireEvent.change(screen.getByPlaceholderText('Filter locally'), { target: { value: 'Bob' } })
    await waitFor(() => expect(screen.queryByText('Alice')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: '清空搜索' }))
    expect(await screen.findByText('Alice')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()
  })

  it('keeps grouped fields registered for validation and parsed payloads', async () => {
    const onFinish = vi.fn(async () => false)
    const columns = [
      { dataIndex: 'name', title: 'Name', formItemProps: { required: false, rules: z.string().trim().min(1) } },
      {
        dataIndex: 'threshold',
        title: 'Threshold',
        valueType: 'digit',
        formItemProps: { required: false, rules: z.number().min(10, 'Threshold too small') }
      }
    ] as const
    mount(
      <BetaSchemaForm
        columns={columns}
        onFinish={onFinish}
        formItemsRender={items => (
          <>
            <div>{items.filter(item => item.name !== 'threshold').map(item => item.dom)}</div>
            <section aria-label="Advanced">
              {items.filter(item => item.name === 'threshold').map(item => item.dom)}
            </section>
          </>
        )}
      />
    )
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: '  Grouped  ' } })
    fireEvent.change(within(screen.getByRole('region', { name: 'Advanced' })).getByRole('spinbutton'), {
      target: { value: '5' }
    })
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    expect(await screen.findByText('Threshold too small')).toBeTruthy()
    expect(onFinish).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: '提交' }))
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith({ name: 'Grouped', threshold: 20 }))
  })

  it('protects selected submit mode during the validation phase', async () => {
    const modes: string[] = []
    function Example() {
      const selectedMode = useRef('')
      return (
        <BetaSchemaForm
          columns={[
            { dataIndex: 'name', title: 'Name', initialValue: 'Ready', formItemProps: { rules: z.string().min(1) } }
          ]}
          onFinish={async () => {
            modes.push(selectedMode.current)
            return false
          }}
          submitter={{
            render: ({ form, submit }) => (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (!form.isSubmitting) {
                      selectedMode.current = 'draft'
                      submit()
                    }
                  }}
                >
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!form.isSubmitting) {
                      selectedMode.current = 'publish'
                      submit()
                    }
                  }}
                >
                  Publish
                </button>
              </>
            )
          }}
        />
      )
    }
    mount(<Example />)
    const draft = screen.getByRole('button', { name: 'Draft' })
    const publish = screen.getByRole('button', { name: 'Publish' })
    act(() => {
      draft.click()
      publish.click()
    })
    await waitFor(() => expect(modes).toEqual(['draft']))
  })
})
