import { Switch } from '@/components/ui/switch'

import { useFieldControl } from './form-context'
import { FormItem, splitFormItemProps, type FormItemLabelProps } from './form-item'

type SwitchValue = string | number | boolean

interface SwitchInputProps extends FormItemLabelProps {
  /** The value stored when on. Defaults to 1, the backend's 启用 status. */
  readonly checkedValue?: SwitchValue
  /** The value stored when off. Defaults to 2, the backend's 禁用 status. Swap the two for an inverted switch. */
  readonly uncheckedValue?: SwitchValue
  readonly disabled?: boolean
}

/** An on/off switch with its label on the left, storing `checkedValue` or `uncheckedValue`. */
export function SwitchInput(props: SwitchInputProps) {
  const [itemProps, { checkedValue = 1, uncheckedValue = 2, disabled }] = splitFormItemProps(props)
  const { field, id, value, errors, invalid } = useFieldControl<SwitchValue>()

  return (
    <FormItem {...itemProps} id={id} errors={errors} orientation="horizontal">
      <Switch
        id={id}
        checked={value === checkedValue}
        onCheckedChange={checked => field.handleChange(checked ? checkedValue : uncheckedValue)}
        onBlur={field.handleBlur}
        disabled={disabled}
        aria-invalid={invalid}
      />
    </FormItem>
  )
}
