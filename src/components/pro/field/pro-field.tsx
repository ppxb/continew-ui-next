import { isValidElement, type ReactNode } from 'react'

import { CopyButton } from '@/components/copy-button'
import { QueryState } from '@/components/query-state'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import { getColumnTitle, getFieldProps } from '../column-utils'
import { useProConfig } from '../provider'
import type { ProFieldColumn, ProFieldControlProps, ProFormInstance, ProSchemaComponentTypes } from '../typing'
import { renderEnumValue } from './value-enum'
import { useFieldOptions } from './use-field-options'

export interface ProFieldProps<T> {
  column: ProFieldColumn<T>
  value: unknown
  entity?: T
  type: ProSchemaComponentTypes
  mode?: 'read' | 'edit'
  light?: boolean
  /** With `light`: the label sits above the control (the filter drawer), so the control drops its inline prefix. */
  labelled?: boolean
  form?: ProFormInstance
  control?: ProFieldControlProps
  emptyText?: ReactNode
}

export function ProField<T>({
  column,
  value,
  entity,
  type,
  mode = 'read',
  light,
  labelled,
  form,
  control,
  emptyText = EMPTY_PLACEHOLDER
}: ProFieldProps<T>) {
  const registry = useProConfig()
  const options = useFieldOptions(column)
  const valueType = column.valueType ?? 'text'
  const renderer = registry[valueType]
  if (!renderer) throw new Error(`Unregistered valueType: ${valueType}`)
  const fieldProps = getFieldProps(column, type, form, entity)
  if (column.request && options.isError)
    return <QueryState state="error" title="选项加载失败" onRetry={() => void options.refetch()} className="p-2" />
  if (mode === 'edit') {
    const onChange = fieldProps.onChange
    if (!renderer.formItemRender) throw new Error(`valueType cannot be edited: ${valueType}`)
    return renderer.formItemRender(value, {
      mode,
      type,
      light,
      labelled,
      label: getColumnTitle(column, type),
      options: options.options,
      fieldProps: {
        ...fieldProps,
        ...control,
        value,
        disabled:
          Boolean(fieldProps.disabled) || Boolean(control?.disabled) || (Boolean(column.request) && options.isPending),
        onChange: next => {
          control?.onChange(next)
          if (typeof onChange === 'function') onChange(next)
        }
      }
    })
  }
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return <span>{emptyText}</span>
  const dom =
    column.valueEnum || column.request
      ? renderEnumValue(value, column.valueEnum, options.options)
      : renderer.render
        ? renderer.render(value, { mode, type, fieldProps })
        : isValidElement(value)
          ? value
          : String(value)
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
  const output =
    column.ellipsis || (valueType === 'textarea' && type === 'descriptions') ? (
      <span
        className={
          type === 'table' && column.ellipsis ? 'inline-block max-w-56 truncate align-middle' : 'whitespace-pre-wrap'
        }
        title={column.ellipsis ? text : undefined}
      >
        {dom}
      </span>
    ) : (
      dom
    )
  return column.copyable && text ? (
    <span className="inline-flex items-center gap-1.5">
      {output}
      <CopyButton value={text} />
    </span>
  ) : (
    <>{output}</>
  )
}
