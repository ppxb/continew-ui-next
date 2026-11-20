import { useId } from 'react'

import { cn } from 'cn'

import { getColumnKey, getColumnTitle } from '../column-utils'
import { ProField } from '../field/pro-field'
import type { ProFieldColumn, ProFormInstance, ProValues } from '../typing'

export function ProTableSearchFields<T>({
  columns,
  values,
  form,
  onChange,
  labelled = false
}: {
  columns: readonly ProFieldColumn<T>[]
  values: ProValues
  form: ProFormInstance
  onChange: (name: string, value: unknown) => void
  /** Show each label above its control, as a form, instead of inside the compact inline control. */
  labelled?: boolean
}) {
  const prefix = useId()
  return columns.map((column, index) => {
    const name = column.dataIndex!
    const id = `${prefix}-${getColumnKey(column, index)}`
    const control = {
      id,
      value: values[name],
      onChange: (value: unknown) => onChange(name, value),
      onBlur: () => {},
      invalid: false
    }
    const defaultRender = () => (
      <ProField
        column={column}
        value={values[name]}
        type="table"
        mode="edit"
        light
        labelled={labelled}
        form={form}
        control={control}
      />
    )
    return (
      <div key={getColumnKey(column, index)} className={cn('min-w-0', labelled && 'flex flex-col gap-2')}>
        <label htmlFor={id} className={labelled ? 'text-sm font-medium' : 'sr-only'}>
          {getColumnTitle(column, 'table')}
        </label>
        {column.formItemRender
          ? column.formItemRender(
              { ...column, type: 'table' },
              { ...control, type: 'table', labelled, defaultRender },
              form
            )
          : defaultRender()}
      </div>
    )
  })
}
