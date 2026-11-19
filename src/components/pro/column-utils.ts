import type {
  ProColumnBase,
  ProColumns,
  ProFieldColumn,
  ProFormInstance,
  ProSchemaComponentTypes,
  ProValues
} from './typing'

export function isFieldColumn<T>(column: ProColumns<T>): column is ProFieldColumn<T> {
  return column.valueType !== 'dependency'
}

/** Resolves dependency layouts without discarding their shared table/detail fields. */
export function getFieldColumns<T>(columns: readonly ProColumns<T>[], values: Partial<T> = {}): ProFieldColumn<T>[] {
  return columns.flatMap(column =>
    isFieldColumn(column)
      ? [column]
      : getFieldColumns(
          column.columns(Object.fromEntries(column.name.map(name => [name, values[name]])) as Partial<T>),
          values
        )
  )
}

export function getColumnKey<T>(column: ProFieldColumn<T>, index = 0) {
  return (
    column.key ??
    column.dataIndex ??
    (column.valueType === 'index' ? 'index' : column.valueType === 'option' ? 'actions' : `column-${index}`)
  )
}

export function getColumnTitle<T>(column: ProColumnBase<T>, type: ProSchemaComponentTypes) {
  return typeof column.title === 'function' ? column.title(column, type) : column.title
}

export function getFieldProps<T>(
  column: ProFieldColumn<T>,
  type: ProSchemaComponentTypes,
  form?: ProFormInstance,
  entity?: T
): ProValues {
  const props =
    typeof column.fieldProps === 'function' ? column.fieldProps(form, { ...column, type, entity }) : column.fieldProps
  return (props ?? {}) as ProValues
}
