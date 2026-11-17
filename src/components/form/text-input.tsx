import type { ComponentProps, ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'

import { useFieldControl } from './form-context'
import { FormItem, splitFormItemProps, type FormItemLabelProps } from './form-item'

type NativeInputProps = Omit<
  ComponentProps<'input'>,
  'id' | 'name' | 'type' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'required' | 'className'
>

interface TextInputProps extends FormItemLabelProps, NativeInputProps {
  readonly type?: 'text' | 'email' | 'tel' | 'url'
  /** A prefix drawn inside the start of the input, such as 「http(s)://」. */
  readonly addonStart?: ReactNode
  /** A unit or hint drawn inside the end of the input, such as 「秒」. */
  readonly addonEnd?: ReactNode
}

/** A single-line text input bound to a `string` field. */
export function TextInput(props: TextInputProps) {
  const [itemProps, { addonStart, addonEnd, type = 'text', ...inputProps }] = splitFormItemProps(props)
  const { field, id, value, errors, invalid } = useFieldControl<string>()
  const controlProps = {
    ...inputProps,
    id,
    name: field.name,
    type,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => field.handleChange(event.target.value),
    onBlur: field.handleBlur,
    'aria-invalid': invalid
  }

  return (
    <FormItem {...itemProps} id={id} errors={errors}>
      {addonStart || addonEnd ? (
        <InputGroup>
          {addonStart ? (
            <InputGroupAddon align="inline-start">
              <span className="text-xs text-muted-foreground">{addonStart}</span>
            </InputGroupAddon>
          ) : null}
          <InputGroupInput {...controlProps} />
          {addonEnd ? <InputGroupAddon align="inline-end">{addonEnd}</InputGroupAddon> : null}
        </InputGroup>
      ) : (
        <Input {...controlProps} />
      )}
    </FormItem>
  )
}
