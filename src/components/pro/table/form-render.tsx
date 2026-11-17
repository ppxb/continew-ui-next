import { useId } from 'react'

import { getColumnKey, getColumnTitle } from '../column-utils'
import { ProField } from '../field/pro-field'
import type { ProFieldColumn, ProFormInstance, ProValues } from '../typing'

export function ProTableSearchFields<T>({ columns, values, form, onChange }: {
  columns: readonly ProFieldColumn<T>[]
  values: ProValues
  form: ProFormInstance
  onChange: (name: string, value: unknown) => void
}) {
  const prefix = useId()
  return columns.map((column, index) => {
    const name = column.dataIndex!
    const id = `${prefix}-${getColumnKey(column, index)}`
    const control = { id, value: values[name], onChange: (value: unknown) => onChange(name, value), onBlur: () => {}, invalid: false }
    const defaultRender = () => <ProField column={column} value={values[name]} type="table" mode="edit" light form={form} control={control} />
    return (
      <div key={getColumnKey(column, index)} className="min-w-0">
        <label htmlFor={id} className="sr-only">{getColumnTitle(column, 'table')}</label>
        {column.formItemRender ? column.formItemRender({ ...column, type: 'table' }, { ...control, type: 'table', defaultRender }, form) : defaultRender()}
      </div>
    )
  })
}
