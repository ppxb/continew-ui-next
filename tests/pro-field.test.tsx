// @vitest-environment jsdom

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { renderEnumValue, valueEnumToOptions } from '@/components/pro/field/value-enum'
import { ProField } from '@/components/pro/field/pro-field'
import type { ProFieldColumn, ProSchemaValueEnumType, ProValue } from '@/components/pro/typing'
import { DateRangeFilter } from '@/components/date-range-filter'
import { installBrowserAnimationApis } from './browser-apis'

const clients: QueryClient[] = []
let restoreAnimations: () => void
beforeEach(() => {
  restoreAnimations = installBrowserAnimationApis()
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
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
  restoreAnimations()
  vi.unstubAllGlobals()
})

describe('ProField value enums', () => {
  it('keeps numeric and boolean keys instead of stringifying select values', () => {
    const options = valueEnumToOptions(
      new Map<ProValue, ProSchemaValueEnumType>([
        [0, { text: '未启用', status: 'Default' as const }],
        [false, { text: '否', disabled: true }]
      ])
    )
    expect(options).toEqual([
      { value: 0, label: '未启用', status: 'Default', disabled: undefined, color: undefined },
      { value: false, label: '否', disabled: true, status: undefined, color: undefined }
    ])
    expect(renderToStaticMarkup(<>{renderEnumValue(0, new Map([[0, '零']]))}</>)).toBe('零')
    expect(renderToStaticMarkup(<>{renderEnumValue(false, new Map([[false, '否']]))}</>)).toBe('否')
  })

  it('does not confuse false or zero with an empty value and maps known statuses to the existing badges', () => {
    const known = { '0': { text: '停止', status: 'Error' as const } }
    const html = renderToStaticMarkup(<>{renderEnumValue(0, known)}</>)
    expect(html).toContain('停止')
    expect(html).toContain('text-destructive')
    expect(renderToStaticMarkup(<>{renderEnumValue('unknown', known)}</>)).toBe('unknown')
    expect(
      renderToStaticMarkup(
        <>
          {renderEnumValue(
            [0, 1],
            new Map([
              [0, '关闭'],
              [1, '开启']
            ])
          )}
        </>
      )
    ).toContain('关闭')
  })
})

describe('ProField controlled values', () => {
  it('retains numeric and boolean selections in a multiple search field', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    clients.push(client)
    const onChange = vi.fn()
    const column: ProFieldColumn<{ tags: ProValue[] }> = {
      dataIndex: 'tags',
      valueType: 'select',
      title: 'Tags',
      fieldProps: { mode: 'multiple' },
      valueEnum: new Map<ProValue, string>([
        [0, 'Zero'],
        [false, 'False']
      ])
    }
    function Example() {
      const [value, setValue] = useState<ProValue[]>([])
      return (
        <ProField
          column={column}
          type="table"
          mode="edit"
          light
          value={value}
          control={{
            id: 'tags',
            value,
            onChange: next => {
              onChange(next)
              setValue(next as ProValue[])
            },
            onBlur: () => {},
            invalid: false
          }}
        />
      )
    }
    render(
      <QueryClientProvider client={client}>
        <Example />
      </QueryClientProvider>
    )
    fireEvent.click(screen.getByRole('combobox'))
    const zeroOption = await screen.findByRole('option', { name: 'Zero' })
    fireEvent.pointerDown(zeroOption, { pointerType: 'mouse' })
    fireEvent.click(zeroOption)
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([0]))
    const falseOption = await screen.findByRole('option', { name: 'False' })
    fireEvent.pointerDown(falseOption, { pointerType: 'mouse' })
    fireEvent.click(falseOption)
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([0, false]))
  })

  it('passes the loaded entity into record-dependent field props', () => {
    const client = new QueryClient()
    clients.push(client)
    const column: ProFieldColumn<{ name: string; disabled: boolean }> = {
      dataIndex: 'name',
      title: 'Name',
      fieldProps: (_form, schema) => ({ disabled: schema.entity?.disabled })
    }
    render(
      <QueryClientProvider client={client}>
        <ProField
          column={column}
          entity={{ name: 'Ada', disabled: true }}
          value="Ada"
          type="form"
          mode="edit"
          control={{ id: 'name', value: 'Ada', onChange: vi.fn(), onBlur: vi.fn(), invalid: false }}
        />
      </QueryClientProvider>
    )
    expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true)
  })

  it('closes an already open portaled range picker when disabled', async () => {
    const onChange = vi.fn()
    const view = render(<DateRangeFilter value={undefined} onChange={onChange} placeholder="Range" />)
    fireEvent.click(screen.getByRole('button', { name: 'Range' }))
    await screen.findAllByRole('grid')
    view.rerender(<DateRangeFilter value={undefined} onChange={onChange} placeholder="Range" disabled />)
    expect((screen.getByRole('button', { name: 'Range' }) as HTMLButtonElement).disabled).toBe(true)
    await waitFor(() => expect(screen.queryAllByRole('grid')).toEqual([]))
    expect(onChange).not.toHaveBeenCalled()
  })
})
