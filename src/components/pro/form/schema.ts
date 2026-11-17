import { z } from 'zod'

import { getFieldProps, isFieldColumn } from '../column-utils'
import type { ProColumns, ProFieldColumn, ProFormInstance, ProFormItemProps, ProValues, ProValueTypeMap } from '../typing'

export function getFormEmptyValue<T>(column: ProFieldColumn<T>, registry: ProValueTypeMap, form?: ProFormInstance, entity?: T): unknown {
  if (column.valueType === 'select' && getFieldProps(column, 'form', form, entity).mode === 'multiple') return []
  return registry[column.valueType ?? 'text']?.initialValue
}

export function getFormInitialValue<T>(column: ProFieldColumn<T>, registry: ProValueTypeMap, form?: ProFormInstance, entity?: T): unknown {
  return column.initialValue !== undefined ? column.initialValue : getFormEmptyValue(column, registry, form, entity)
}
export function getFormColumns<T>(columns: readonly ProColumns<T>[], values: ProValues): ProFieldColumn<T>[] {
  const active: ProFieldColumn<T>[] = []
  for (const column of columns) {
    if (!isFieldColumn(column)) {
      const watched = Object.fromEntries(column.name.map(name => [name, values[name]])) as Partial<T>
      active.push(...getFormColumns(column.columns(watched), values))
    } else if (!column.hideInForm && column.valueType !== 'index' && column.valueType !== 'option' && column.dataIndex) {
      active.push(column)
    }
  }
  return active.sort((left, right) => (right.order ?? 0) - (left.order ?? 0))
}

export function getFormItemProps<T>(column: ProFieldColumn<T>, form: ProFormInstance, entity?: T): ProFormItemProps {
  return (typeof column.formItemProps === 'function'
    ? column.formItemProps(form, { ...column, type: 'form', entity })
    : column.formItemProps) ?? {}
}

export function buildFormDefaults<T>(columns: readonly ProColumns<T>[], registry: ProValueTypeMap, initialValues: ProValues = {}, entity?: T, form?: ProFormInstance): ProValues {
  const values: ProValues = { ...initialValues }
  const defaultForm: ProFormInstance | undefined = form ? {
    ...form,
    getFieldValue: name => Object.hasOwn(values, name) ? values[name] : entity === undefined ? undefined : (entity as ProValues)[name],
    getFieldsValue: () => values
  } : undefined
  const visit = (items: readonly ProColumns<T>[]) => {
    for (const column of items) {
      if (!isFieldColumn(column) || !column.dataIndex || column.hideInForm || column.valueType === 'index' || column.valueType === 'option') continue
      const name = column.dataIndex
      const fallback = Object.hasOwn(initialValues, name) ? initialValues[name] : getFormInitialValue(column, registry, defaultForm, entity)
      const value = entity === undefined ? undefined : (entity as ProValues)[name]
      values[name] = entity === undefined ? fallback : column.convertValue ? column.convertValue(value, name, entity) : value ?? fallback
    }
    for (const column of items) {
      if (!isFieldColumn(column)) {
        const watched = Object.fromEntries(column.name.map(name => [name, values[name]])) as Partial<T>
        visit(column.columns(watched))
      }
    }
  }
  visit(columns)
  return values
}

export function buildFormSchema<T>(columns: readonly ProFieldColumn<T>[], form: ProFormInstance, entity?: T) {
  const rules: Record<string, z.ZodType> = {}
  for (const column of columns) {
    const rule = getFormItemProps(column, form, entity).rules
    if (column.dataIndex && rule) rules[column.dataIndex] = rule
  }
  return z.looseObject(rules)
}

export function pickFormValues<T>(columns: readonly ProFieldColumn<T>[], values: ProValues): ProValues {
  return Object.fromEntries(columns.flatMap(column => column.dataIndex ? [[column.dataIndex, values[column.dataIndex]]] : []))
}

export function formatFormValues<T>(columns: readonly ProColumns<T>[], values: ProValues, form: ProFormInstance, entity?: T): ProValues {
  const active = getFormColumns(columns, values)
  return buildFormSchema(active, form, entity).parse(pickFormValues(active, values))
}
