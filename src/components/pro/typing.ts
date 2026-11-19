import type { ComponentProps, ReactNode, Ref } from 'react'

import type { QueryKey } from '@tanstack/react-query'
import type { z } from 'zod'

import type { FormItemLabelProps } from '@/components/form'
import type { TablePaginationOptions } from '@/components/table-pagination'
import type { BadgeTone } from '@/components/tone-badge'

export type ProSchemaComponentTypes = 'table' | 'form' | 'descriptions'
export type ProFieldFCMode = 'read' | 'edit'
export type ProValue = string | number | boolean
export type ProValues = Record<string, unknown>

export interface ProSchemaValueEnumType {
  text: ReactNode
  status?: 'Success' | 'Error' | 'Processing' | 'Warning' | 'Default'
  color?: BadgeTone
  disabled?: boolean
}

export type ProSchemaValueEnumObj = Record<string, ProSchemaValueEnumType | ReactNode>
export type ProSchemaValueEnumMap = Map<ProValue, ProSchemaValueEnumType | ReactNode>
export type ProFieldValueEnum = ProSchemaValueEnumObj | ProSchemaValueEnumMap

export interface RequestOptionsType {
  label: ReactNode
  value: ProValue
  disabled?: boolean
  status?: ProSchemaValueEnumType['status']
  color?: BadgeTone
}

export type ProFieldRequestData = (params: ProValues, props: { signal: AbortSignal }) => Promise<RequestOptionsType[]>

type InputProps = Omit<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'id' | 'name' | 'required' | 'className'
>

interface ProFieldEvents {
  onChange?: (value: unknown) => void
}

/** Extend this interface when registering a project valueType. */
export interface ProFieldValueTypeWithFieldProps {
  index: Record<string, never>
  option: Record<string, never>
  text: InputProps & ProFieldEvents & { addonStart?: ReactNode; addonEnd?: ReactNode }
  password: InputProps & ProFieldEvents
  textarea: Omit<
    ComponentProps<'textarea'>,
    'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'id' | 'name' | 'required' | 'className'
  > &
    ProFieldEvents
  digit: InputProps & ProFieldEvents & { addonEnd?: ReactNode }
  select: ProFieldEvents & { placeholder?: string; disabled?: boolean; mode?: 'multiple' }
  switch: ProFieldEvents & { checkedValue?: ProValue; uncheckedValue?: ProValue; disabled?: boolean }
  dateTime: ProFieldEvents & { placeholder?: string; disabled?: boolean }
  dateRange: { placeholder?: string; disabled?: boolean }
  dateTimeRange: { placeholder?: string; disabled?: boolean }
}

export type ProFieldValueType = keyof ProFieldValueTypeWithFieldProps

export interface ProFormItemProps extends Omit<FormItemLabelProps, 'label'> {
  rules?: z.ZodType
}

export interface ProFormInstance<Values = ProValues> {
  readonly isSubmitting: boolean
  getFieldValue: (name: string) => unknown
  getFieldsValue: () => Values
  getFieldsFormatValue: () => Values
  setFieldsValue: (values: Partial<Values>) => void
  resetFields: () => void
  submit: () => void
}

export interface ProFieldControlProps {
  id: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  invalid: boolean
  disabled?: boolean
}

export interface ProFormItemRenderConfig extends ProFieldControlProps {
  type: ProSchemaComponentTypes
  defaultRender: () => ReactNode
}

export interface ProColumnBase<T> {
  key?: string
  dataIndex?: Extract<keyof T, string>
  title?: ReactNode | ((schema: ProColumnBase<T>, type: ProSchemaComponentTypes) => ReactNode)
  valueEnum?: ProFieldValueEnum
  renderText?: (text: unknown, record: T, index: number, action: ActionType | undefined) => unknown
  render?: (
    dom: ReactNode,
    record: T,
    index: number,
    action: ActionType | undefined,
    schema: ProSchemaConfig<T>
  ) => ReactNode
  formItemProps?: ProFormItemProps | ((form: ProFormInstance, schema: ProSchemaConfig<T>) => ProFormItemProps)
  formItemRender?: (schema: ProSchemaConfig<T>, config: ProFormItemRenderConfig, form: ProFormInstance) => ReactNode
  ignoreFormItem?: boolean
  initialValue?: unknown
  convertValue?: (value: unknown, field: string, entity: T) => unknown
  dependencies?: readonly Extract<keyof T, string>[]
  order?: number
  hideInTable?: boolean
  hideInForm?: boolean
  hideInDescriptions?: boolean
  hideInSetting?: boolean
  search?: boolean | { transform: (value: unknown, field: string) => ProValues }
  ellipsis?: boolean
  copyable?: boolean
  align?: 'left' | 'center' | 'right'
  span?: 1 | 2
}

export type ProSchemaConfig<T> = ProColumnBase<T> & { type: ProSchemaComponentTypes; entity?: T }

type ColumnRequest =
  | { request?: undefined; params?: ProValues; proFieldProps?: { proFieldKey: QueryKey } }
  | { request: ProFieldRequestData; params?: ProValues; proFieldProps: { proFieldKey: QueryKey } }

export type ProFieldColumn<T> = {
  [V in ProFieldValueType]: ProColumnBase<T> &
    ColumnRequest & {
      fieldProps?:
        | ProFieldValueTypeWithFieldProps[V]
        | ((form: ProFormInstance | undefined, schema: ProSchemaConfig<T>) => ProFieldValueTypeWithFieldProps[V])
    } & (V extends 'text' ? { valueType?: V } : { valueType: V })
}[ProFieldValueType]

export interface ProDependencyColumn<T> {
  valueType: 'dependency'
  name: readonly Extract<keyof T, string>[]
  columns: (values: Partial<T>) => readonly ProColumns<T>[]
}

export type ProColumns<T = ProValues> = ProFieldColumn<T> | ProDependencyColumn<T>

export interface ProFieldFCRenderProps {
  mode: ProFieldFCMode
  type: ProSchemaComponentTypes
  light?: boolean
  label?: ReactNode
  options?: readonly RequestOptionsType[]
  fieldProps: ProValues & Partial<ProFieldControlProps>
}

export interface ProRenderFieldPropsType {
  render?: (text: unknown, props: ProFieldFCRenderProps) => ReactNode
  formItemRender?: (text: unknown, props: ProFieldFCRenderProps) => ReactNode
  initialValue?: unknown
}

export type ProValueTypeMap = Partial<Record<ProFieldValueType, ProRenderFieldPropsType>>

export interface RequestData<T> {
  data: T[]
  total?: number
  success?: boolean
}

export type SortOrder = 'ascend' | 'descend' | null
export type FilterValue = (string | number)[] | null

export interface ActionType {
  reload: (resetPageIndex?: boolean) => Promise<void>
  reloadAndRest: () => Promise<void>
  reset: () => void
  setPageInfo: (page: { current?: number; pageSize?: number }) => void
  fullScreen: () => void
  readonly pageInfo: { current: number; pageSize: number; total: number }
}

export interface OptionConfig {
  reload?: boolean
  setting?: boolean
  fullScreen?: boolean
  search?:
    | boolean
    | { name?: string; placeholder?: string; delay?: number; onSearch?: (keyword: string) => boolean | void }
}

export type ProTableRequest<T, P> = (
  params: P,
  sort: Record<string, SortOrder>,
  filter: Record<string, FilterValue>,
  signal: AbortSignal
) => Promise<RequestData<T>>

export type ProTableProps<T, U extends ProValues = ProValues> = {
  columns: readonly ProColumns<T>[]
  rowKey: Extract<keyof T, string> | ((record: T) => string)
  dataSource?: T[]
  loading?: boolean
  isError?: boolean
  isShowingPreviousRows?: boolean
  embedded?: boolean
  queryKey: QueryKey
  params?: Partial<U>
  manualRequest?: boolean
  postData?: (data: T[]) => T[]
  actionRef?: Ref<ActionType | undefined>
  formRef?: Ref<ProFormInstance<U> | undefined>
  headerTitle?: ReactNode
  toolbar?: { subTitle?: ReactNode }
  toolBarRender?: false | ((action: ActionType | undefined) => ReactNode[])
  options?: false | OptionConfig
  search?: false
  form?: { initialValues?: Partial<U> }
  columnsState?: { defaultValue?: Record<string, { show?: boolean }> }
  expandable?: {
    childrenColumnName?: Extract<keyof T, string>
    defaultExpandAllRows?: boolean
    expandedRowKeys?: readonly string[]
    onExpandedRowsChange?: (keys: string[]) => void
  }
  columnEmptyText?: string
  locale?: { emptyText?: string }
  cardProps?: false
  tableClassName?: string
} & (
  | {
      dataSource?: never
      pagination?: TablePaginationOptions & { defaultPageSize?: number }
      request: ProTableRequest<T, U & { current: number; pageSize: number }>
    }
  | { dataSource?: never; pagination: false; request: ProTableRequest<T, U> }
  | { dataSource: T[]; request?: never; pagination?: false | (TablePaginationOptions & { defaultPageSize?: number }) }
)

type FormColumn<C> = C extends { hideInForm: true }
  ? never
  : C extends { valueType: 'index' | 'option' | 'dependency' }
    ? never
    : C extends { dataIndex: string }
      ? C
      : never

type FieldValue<T, C> = C extends { formItemProps: { rules: infer R extends z.ZodType } }
  ? z.output<R>
  : C extends { dataIndex: infer K extends keyof T }
    ? T[K]
    : unknown

export type InferFormValues<T, C extends readonly unknown[]> = {
  [Col in FormColumn<C[number]> as Col['dataIndex']]: FieldValue<T, Col>
}

export interface ProSubmitterProps {
  form: ProFormInstance
  isSubmitting: boolean
  submit: () => void
  reset: () => void
  onCancel: () => void
}

export type FormSchema<T, C extends readonly ProColumns<T>[] = readonly ProColumns<T>[], U = ProValues> = {
  columns: C
  grid?: boolean
  formItemsRender?: (items: { name: string; dom: ReactNode }[]) => ReactNode
  initialValues?: ProValues
  request?: (params: U, signal: AbortSignal) => Promise<T>
  params?: U
  queryKey?: QueryKey
  onFinish: (values: InferFormValues<T, C>) => Promise<boolean | void>
  formRef?: Ref<ProFormInstance | undefined>
  submitter?:
    | false
    | {
        searchConfig?: { submitText?: string; resetText?: string }
        render?: (props: ProSubmitterProps, dom: ReactNode[]) => ReactNode
      }
} & (
  | { layoutType?: 'Form'; className?: string }
  | {
      layoutType: 'DrawerForm'
      title: string
      open: boolean
      onOpenChange: (open: boolean) => void
      width?: 30 | 32 | 36 | 38 | 40 | 42 | 44 | 46 | 48
      drawerProps?: { icon?: ReactNode; badge?: ReactNode; description?: string }
    }
)

export interface ProDescriptionsProps<T, U = ProValues> {
  columns: readonly ProColumns<T>[]
  dataSource?: T
  loading?: boolean
  request?: (params: U, signal: AbortSignal) => Promise<{ data: T; success?: boolean }>
  params?: U
  queryKey?: QueryKey
  title?: ReactNode
  column?: 1 | 2
  emptyText?: ReactNode
  className?: string
}
