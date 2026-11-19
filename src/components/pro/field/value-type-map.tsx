import type { ComponentProps } from 'react'

import { format, parseISO } from 'date-fns'

import { DateRangeFilter } from '@/components/date-range-filter'
import { ExpiryPicker } from '@/components/expiry-picker'
import { PasswordInput } from '@/components/password-input'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { ProFieldFCRenderProps, ProValue, ProValueTypeMap } from '../typing'

function TextControl({ fieldProps, light }: ProFieldFCRenderProps) {
  const { value, onChange, onBlur, id, invalid, addonStart, addonEnd, ...rest } = fieldProps
  const props = {
    ...(rest as ComponentProps<'input'>),
    id,
    value: String(value ?? ''),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value),
    onBlur,
    'aria-invalid': invalid
  }
  if (light)
    return (
      <InputGroup className="w-full sm:w-64">
        <InputGroupAddon>
          <Search className="size-3.5" />
        </InputGroupAddon>
        <InputGroupInput {...props} />
      </InputGroup>
    )
  return addonStart || addonEnd ? (
    <InputGroup>
      {addonStart ? <InputGroupAddon>{addonStart as React.ReactNode}</InputGroupAddon> : null}
      <InputGroupInput {...props} />
      {addonEnd ? <InputGroupAddon align="inline-end">{addonEnd as React.ReactNode}</InputGroupAddon> : null}
    </InputGroup>
  ) : (
    <Input {...props} />
  )
}

function DigitControl({ fieldProps }: ProFieldFCRenderProps) {
  const { value, onChange, onBlur, id, invalid, addonEnd, ...rest } = fieldProps
  const props = {
    ...(rest as ComponentProps<'input'>),
    id,
    type: 'number',
    value: value == null ? '' : Number(value),
    onBlur,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange?.(event.target.value === '' ? null : event.target.valueAsNumber),
    'aria-invalid': invalid
  }
  return addonEnd ? (
    <InputGroup>
      <InputGroupInput {...props} />
      <InputGroupAddon align="inline-end">{addonEnd as React.ReactNode}</InputGroupAddon>
    </InputGroup>
  ) : (
    <Input {...props} />
  )
}

function SelectControl({ fieldProps, options = [], label, light }: ProFieldFCRenderProps) {
  const { value, onChange, onBlur, id, invalid, placeholder, disabled, mode } = fieldProps
  // Search uses index tokens to keep string, number and boolean enum keys distinct.
  const multiple = mode === 'multiple'
  const tokens = options.map((option, index) => ({ ...option, value: `option-${index}` }))
  const items = light ? (multiple ? tokens : [{ value: 'all', label: '全部' }, ...tokens]) : options
  const encode = (item: unknown) => `option-${options.findIndex(option => option.value === item)}`
  const selected = multiple
    ? Array.isArray(value)
      ? light
        ? value.map(encode)
        : value
      : []
    : light
      ? value == null || value === ''
        ? 'all'
        : encode(value)
      : value === ''
        ? null
        : (value ?? null)
  return (
    <Select
      multiple={multiple}
      items={items}
      value={selected as ProValue | ProValue[] | null}
      disabled={disabled as boolean | undefined}
      onValueChange={next => {
        if (light) {
          const decode = (token: unknown) => options[tokens.findIndex(item => item.value === token)]?.value
          onChange?.(
            multiple && Array.isArray(next) ? next.map(decode).filter(item => item !== undefined) : decode(next)
          )
        } else onChange?.(next ?? (multiple ? [] : ''))
      }}
    >
      <SelectTrigger id={id} onBlur={onBlur} aria-invalid={invalid} className={light ? 'w-full sm:w-44' : 'w-full'}>
        {light ? <span className="shrink-0 text-muted-foreground">{label}</span> : null}
        <SelectValue placeholder={(placeholder ?? (light ? '全部' : undefined)) as string | undefined} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {items.map(option => (
            <SelectItem key={String(option.value)} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function RangeControl({ fieldProps, label, type }: ProFieldFCRenderProps, withTime: boolean) {
  const { value, onChange, id, invalid, onBlur, placeholder, disabled } = fieldProps
  const range = value as string[] | undefined
  const selected = range?.[0] ? { from: parseISO(range[0]), to: range[1] ? parseISO(range[1]) : undefined } : undefined
  return (
    <div className="min-w-0">
      <DateRangeFilter
        id={id}
        invalid={invalid}
        disabled={Boolean(disabled)}
        onBlur={onBlur}
        value={selected}
        placeholder={(placeholder ?? (typeof label === 'string' ? label : undefined)) as string | undefined}
        onChange={next => {
          if (!next?.from) {
            onChange?.(undefined)
            return
          }
          const start = format(next.from, 'yyyy-MM-dd')
          const end = format(next.to ?? next.from, 'yyyy-MM-dd')
          onChange?.(withTime && type === 'table' ? [`${start} 00:00:00`, `${end} 23:59:59`] : [start, end])
        }}
      />
    </div>
  )
}

export const valueTypeMap: ProValueTypeMap = {
  index: { render: text => <span className="tabular-nums">{Number(text) + 1}</span> },
  option: { render: () => null },
  text: { initialValue: '', formItemRender: (_text, props) => <TextControl {...props} /> },
  textarea: {
    initialValue: '',
    formItemRender: (_text, props) => {
      if (props.light) return <TextControl {...props} />
      const { value, id, onChange, onBlur, invalid, ...rest } = props.fieldProps
      return (
        <Textarea
          {...(rest as ComponentProps<'textarea'>)}
          id={id}
          value={String(value ?? '')}
          onChange={event => onChange?.(event.target.value)}
          onBlur={onBlur}
          aria-invalid={invalid}
        />
      )
    }
  },
  password: {
    initialValue: '',
    render: () => '••••••',
    formItemRender: (_text, { fieldProps: { value, id, onChange, onBlur, invalid, ...rest } }) => (
      <PasswordInput
        {...(rest as ComponentProps<'input'>)}
        id={id}
        value={String(value ?? '')}
        onChange={event => onChange?.(event.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid}
      />
    )
  },
  digit: {
    initialValue: null,
    render: text => <span className="tabular-nums">{String(text)}</span>,
    formItemRender: (_text, props) => <DigitControl {...props} />
  },
  select: { initialValue: '', formItemRender: (_text, props) => <SelectControl {...props} /> },
  switch: {
    initialValue: 1,
    formItemRender: (_text, props) => {
      if (props.light) return <SelectControl {...props} />
      const { value, id, onChange, onBlur, invalid, checkedValue = 1, uncheckedValue = 2, disabled } = props.fieldProps
      return (
        <Switch
          id={id}
          checked={value === checkedValue}
          onCheckedChange={checked => onChange?.(checked ? checkedValue : uncheckedValue)}
          onBlur={onBlur}
          aria-invalid={invalid}
          disabled={disabled as boolean | undefined}
        />
      )
    }
  },
  dateTime: {
    initialValue: '',
    render: text => <span className="tabular-nums">{String(text)}</span>,
    formItemRender: (_text, { fieldProps: { value, id, onChange, onBlur, invalid, placeholder, disabled } }) => (
      <ExpiryPicker
        id={id}
        value={String(value ?? '')}
        onChange={next => onChange?.(next)}
        onBlur={onBlur}
        invalid={invalid}
        placeholder={placeholder as string | undefined}
        disabled={disabled as boolean | undefined}
      />
    )
  },
  dateRange: { initialValue: undefined, formItemRender: (_text, props) => RangeControl(props, false) },
  dateTimeRange: { initialValue: undefined, formItemRender: (_text, props) => RangeControl(props, true) }
}
