import type { ComponentProps } from 'react'

import { PasswordInput as PasswordControl } from '@/components/password-input'

import { useFieldControl } from './form-context'
import { FormItem, splitFormItemProps, type FormItemLabelProps } from './form-item'

type NativeInputProps = Omit<
  ComponentProps<'input'>,
  'id' | 'name' | 'type' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'required' | 'className'
>

interface PasswordInputProps extends FormItemLabelProps, NativeInputProps {}

/** A password input with a show/hide toggle, bound to a `string` field. */
export function PasswordInput(props: PasswordInputProps) {
  const [itemProps, inputProps] = splitFormItemProps(props)
  const { field, id, value, errors, invalid } = useFieldControl<string>()

  return (
    <FormItem {...itemProps} id={id} errors={errors}>
      <PasswordControl
        {...inputProps}
        id={id}
        name={field.name}
        value={value}
        onChange={event => field.handleChange(event.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={invalid}
      />
    </FormItem>
  )
}
