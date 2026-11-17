import type { ComponentProps, ReactNode } from 'react'

import { useFieldControl } from './form-context'
import { FormItem } from './form-item'

/** What the custom control needs to wire itself to the label and the error state. */
export interface CustomFieldControl {
  readonly id: string
  readonly invalid: boolean
}

interface CustomFieldProps extends Omit<ComponentProps<typeof FormItem>, 'id' | 'errors' | 'children'> {
  readonly children: (control: CustomFieldControl) => ReactNode
}

/**
 * Label, required mark, description and errors around a control that is not a registered input,
 * such as a tree select. Pass `id` to the control so clicking the label reaches it; read and write
 * the value through the `field` of the surrounding `form.AppField`.
 */
export function CustomField({ children, ...itemProps }: CustomFieldProps) {
  const { id, errors, invalid } = useFieldControl<unknown>()

  return (
    <FormItem {...itemProps} id={id} errors={errors}>
      {children({ id, invalid })}
    </FormItem>
  )
}
