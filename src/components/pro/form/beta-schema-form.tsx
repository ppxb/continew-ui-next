import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'

import { revalidateLogic, useStore } from '@tanstack/react-form'
import { hashKey, useQuery } from '@tanstack/react-query'
import { cn } from 'cn'

import { EntityDrawer } from '@/components/entity-drawer'
import { FormItem, useAppForm } from '@/components/form'
import { FormSkeleton } from '@/components/form-skeleton'
import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { DrawerFooter } from '@/components/ui/drawer'
import { FieldGroup } from '@/components/ui/field'
import { useLastRecord } from '@/hooks/use-last-record'
import { reportError } from '@/lib/http'

import { getColumnKey, getColumnTitle } from '../column-utils'
import { ProField } from '../field/pro-field'
import { useProConfig } from '../provider'
import type { FormSchema, InferFormValues, ProColumns, ProFormInstance, ProValues } from '../typing'
import { buildFormDefaults, buildFormSchema, formatFormValues, getFormColumns, getFormEmptyValue, getFormInitialValue, getFormItemProps, pickFormValues } from './schema'

export function BetaSchemaForm<T, const C extends readonly ProColumns<T>[] = readonly ProColumns<T>[], U = ProValues>(props: FormSchema<T, C, U>) {
  const drawer = props.layoutType === 'DrawerForm'
  const open = !drawer || props.open
  const shownProps = useLastRecord(open ? props : null) ?? props
  const registry = useProConfig()
  const id = useId()
  const elementRef = useRef<HTMLFormElement>(null)
  const submittingRef = useRef(false)
  const entityRef = useRef<T | undefined>(undefined)
  const latest = useRef({ props: shownProps, registry })
  latest.current = { props: shownProps, registry }
  const instanceRef = useRef<ProFormInstance | undefined>(undefined)
  const [defaultValues] = useState<ProValues>(() => buildFormDefaults(props.columns, registry, props.initialValues))
  const resetValues = useRef(defaultValues)
  const [filledIdentity, setFilledIdentity] = useState<string | null>(null)
  const session = useRef<{ open: boolean; identity: string | null }>({ open: false, identity: null })
  const queryKey = props.queryKey === undefined ? ['pro-form-unconfigured'] : props.params === undefined ? props.queryKey : [...props.queryKey, props.params]
  const identity = `${props.request ? 'edit' : 'create'}:${hashKey(queryKey)}`
  const configurationError = !!props.request && !props.queryKey?.length
  const query = useQuery({
    queryKey,
    enabled: open && !!props.request && !configurationError,
    queryFn: ({ signal }) => {
      if (!props.request) throw new Error('BetaSchemaForm request is not configured')
      return props.request(props.params as U, signal)
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false
  })

  const focusInvalid = useCallback(() => {
    requestAnimationFrame(() => elementRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
  }, [])
  const validate = useCallback(({ value }: { value: ProValues }) => {
    const current = latest.current.props
    const instance = instanceRef.current
    if (!instance) return undefined
    const active = getFormColumns(current.columns, value)
    const result = buildFormSchema(active, instance, entityRef.current).safeParse(pickFormValues(active, value))
    if (result.success) return undefined
    const fields: Record<string, { message: string }[]> = {}
    for (const issue of result.error.issues) {
      const name = String(issue.path[0] ?? '')
      ;(fields[name] ??= []).push({ message: issue.message })
    }
    return { fields }
  }, [])
  const form = useAppForm({
    defaultValues,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: validate },
    onSubmitInvalid: focusInvalid,
    onSubmit: async ({ value }) => {
      const current = latest.current.props
      const instance = instanceRef.current
      if (!instance) return
      try {
        const formatted = formatFormValues(current.columns, value, instance, entityRef.current)
        const closed = await current.onFinish(formatted as InferFormValues<T, C>)
        if (closed && current.layoutType === 'DrawerForm') current.onOpenChange(false)
      } catch (error) {
        reportError(error)
      }
    }
  })
  const values = useStore(form.store, state => state.values)
  const isSubmitting = useStore(form.store, state => state.isSubmitting)
  const submit = useCallback(async () => {
    if (!open || configurationError || filledIdentity !== identity || submittingRef.current || form.state.isSubmitting) return
    submittingRef.current = true
    try {
      await form.validate('submit')
      await form.handleSubmit()
      focusInvalid()
    } finally {
      submittingRef.current = false
    }
  }, [form, focusInvalid, open, configurationError, filledIdentity, identity])
  const liveForm = useRef({ form, submit })
  liveForm.current = { form, submit }
  const [instance] = useState<ProFormInstance>(() => ({
    getFieldValue: name => liveForm.current.form.getFieldValue(name),
    getFieldsValue: () => liveForm.current.form.state.values,
    getFieldsFormatValue: () => formatFormValues(latest.current.props.columns, liveForm.current.form.state.values, instanceRef.current!, entityRef.current),
    setFieldsValue: next => {
      for (const [name, value] of Object.entries(next)) liveForm.current.form.setFieldValue(name, value)
    },
    resetFields: () => liveForm.current.form.reset(resetValues.current, { keepDefaultValues: true }),
    submit: () => { void liveForm.current.submit() }
  }))
  instanceRef.current = instance
  useImperativeHandle(props.formRef, () => instance, [instance])

  useEffect(() => {
    if (!open) {
      session.current.open = false
      return
    }
    if (!session.current.open || session.current.identity !== identity) {
      session.current = { open: true, identity }
      entityRef.current = undefined
      const defaults = buildFormDefaults(latest.current.props.columns, latest.current.registry, latest.current.props.initialValues, undefined, instance)
      resetValues.current = defaults
      form.reset(defaults, { keepDefaultValues: true })
      setFilledIdentity(props.request ? null : identity)
    }
    if (props.request && filledIdentity !== identity && query.isSuccess && !query.isFetching) {
      entityRef.current = query.data
      const filled = buildFormDefaults(latest.current.props.columns, latest.current.registry, latest.current.props.initialValues, query.data, instance)
      resetValues.current = filled
      form.reset(filled, { keepDefaultValues: true })
      setFilledIdentity(identity)
    }
  }, [open, identity, props.request, query.data, query.isSuccess, query.isFetching, filledIdentity, form, instance])

  const active = getFormColumns(shownProps.columns, values)
  const close = () => {
    if (!form.state.isSubmitting && !submittingRef.current && props.layoutType === 'DrawerForm') props.onOpenChange(false)
  }
  const texts = shownProps.submitter === false ? undefined : shownProps.submitter?.searchConfig
  const footer = shownProps.submitter === false ? undefined : drawer ? (
    <form.FormFooter onCancel={close} cancelText={texts?.resetText} submitText={texts?.submitText} />
  ) : (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" disabled={isSubmitting} onClick={instance.resetFields}>{texts?.resetText ?? '重置'}</Button>
      <Button type="submit" disabled={isSubmitting}>{texts?.submitText ?? '提交'}</Button>
    </div>
  )
  const loading = open && (filledIdentity !== identity || !session.current.open)
  const body = configurationError ? (
    <QueryState state="error" title="BetaSchemaForm 配置错误：request 必须提供 queryKey" />
  ) : loading && query.isError ? (
    <QueryState state="error" onRetry={() => { void query.refetch() }} />
  ) : loading ? (
    <div className="flex min-h-0 flex-1 flex-col">
      <FormSkeleton fields={active.map(column => column.valueType === 'textarea' ? 'textarea' : column.valueType === 'switch' ? 'switch' : 'input')} />
      {drawer && shownProps.submitter !== false ? (
        <DrawerFooter>
          <Button type="button" variant="outline" onClick={close}>{texts?.resetText ?? '取消'}</Button>
          <Button type="button" disabled>{texts?.submitText ?? '保存'}</Button>
        </DrawerFooter>
      ) : null}
    </div>
  ) : (
    <form.AppForm>
      <form
        ref={elementRef}
        noValidate
        className={cn(drawer ? 'flex min-h-0 flex-1 flex-col' : 'flex flex-col gap-4', !drawer && shownProps.layoutType !== 'DrawerForm' && shownProps.className)}
        onSubmit={event => { event.preventDefault(); void submit() }}
      >
        <div className={drawer ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain p-4' : undefined}>
          <FieldGroup className="gap-4">
            {active.map((column, index) => {
              const name: string = column.dataIndex!
              const { rules, ...itemProps } = getFormItemProps(column, instance, entityRef.current)
              const required = itemProps.required ?? (!!rules && !rules.safeParse(getFormEmptyValue(column, registry, instance, entityRef.current)).success)
              return (
                <form.AppField key={getColumnKey(column, index)} name={name} defaultValue={Object.hasOwn(values, name) ? values[name] : getFormInitialValue(column, registry, instance, entityRef.current)}>
                  {field => {
                    const errors = field.state.meta.errors.map(error => typeof error === 'string' ? { message: error } : error as { message?: string })
                    const control = { id: `${id}-${name}`, value: field.state.value, onChange: (value: unknown) => field.handleChange(value), onBlur: field.handleBlur, invalid: errors.length > 0 }
                    const defaultRender = () => <ProField column={column} value={control.value} type="form" mode="edit" form={instance} control={control} entity={entityRef.current} />
                    const dom = column.formItemRender ? column.formItemRender({ ...column, type: 'form', entity: entityRef.current }, { ...control, type: 'form', defaultRender }, instance) : defaultRender()
                    return column.ignoreFormItem && column.formItemRender ? dom : (
                      <FormItem {...itemProps} id={control.id} label={getColumnTitle(column, 'form')} required={required} errors={errors} orientation={column.valueType === 'switch' ? 'horizontal' : 'vertical'}>{dom}</FormItem>
                    )
                  }}
                </form.AppField>
              )
            })}
          </FieldGroup>
        </div>
        {footer}
      </form>
    </form.AppForm>
  )

  if (props.layoutType !== 'DrawerForm') return body
  const header = shownProps.layoutType === 'DrawerForm' ? shownProps : props
  return (
    <EntityDrawer open={props.open} onClose={close} title={header.title} width={header.width} {...header.drawerProps} closeDisabled={isSubmitting} canClose={() => !form.state.isSubmitting && !submittingRef.current}>
      {body}
    </EntityDrawer>
  )
}
