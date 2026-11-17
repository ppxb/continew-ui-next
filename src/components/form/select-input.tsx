import type { ReactNode } from 'react'

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { useFieldControl } from './form-context'
import { FormItem, splitFormItemProps, type FormItemLabelProps } from './form-item'

export interface SelectOption {
  readonly label: string
  readonly value: string | number
}

interface SelectInputProps<TOption extends SelectOption> extends FormItemLabelProps {
  readonly options: ReadonlyArray<TOption>
  readonly placeholder?: string
  readonly disabled?: boolean
  /** Custom content of one option row, such as a color dot before the label. */
  readonly renderOption?: (option: TOption) => ReactNode
}

/**
 * A single-choice dropdown bound to a `string` or `number` field, storing the picked option's
 * `value` as is. `''` and `null` show the placeholder; `0` is a real value.
 */
export function SelectInput<TOption extends SelectOption>(props: SelectInputProps<TOption>) {
  const [itemProps, { options, placeholder, disabled, renderOption }] = splitFormItemProps(props)
  const { field, id, value, errors, invalid } = useFieldControl<TOption['value'] | '' | null>()

  return (
    <FormItem {...itemProps} id={id} errors={errors}>
      <Select
        items={options}
        value={value === '' ? null : value}
        onValueChange={next => field.handleChange(next ?? '')}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full" onBlur={field.handleBlur} aria-invalid={invalid}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {options.map(option => (
              <SelectItem key={String(option.value)} value={option.value}>
                {renderOption ? renderOption(option) : option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FormItem>
  )
}
