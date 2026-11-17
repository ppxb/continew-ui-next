import type { ReactNode } from 'react'

import { RequiredMark } from '@/components/required-mark'
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'

/** The label and layout props every registered input accepts. */
export interface FormItemLabelProps {
  readonly label?: ReactNode
  readonly description?: ReactNode
  /** Only draws the required mark; the schema decides whether the value is required. */
  readonly required?: boolean
  /** Hides the description while the field shows an error, so the two never stack. */
  readonly hideDescriptionOnError?: boolean
  /** Classes for the field wrapper, such as `sm:col-span-2` inside a grid. */
  readonly className?: string
}

/** A `Record` over every key, so adding a prop to `FormItemLabelProps` without listing it here fails to compile. */
const LABEL_PROP_KEYS: Record<keyof FormItemLabelProps, true> = {
  label: true,
  description: true,
  required: true,
  hideDescriptionOnError: true,
  className: true
}

/**
 * Splits a registered input's props into the ones `FormItem` takes and the ones the control takes,
 * so a new `FormItem` prop reaches every input without touching them one by one.
 */
export function splitFormItemProps<T extends FormItemLabelProps>(
  props: T
): [FormItemLabelProps, Omit<T, keyof FormItemLabelProps>] {
  const itemProps: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    ;(Object.hasOwn(LABEL_PROP_KEYS, key) ? itemProps : rest)[key] = value
  }
  return [itemProps as FormItemLabelProps, rest as Omit<T, keyof FormItemLabelProps>]
}

interface FormItemProps extends FormItemLabelProps {
  /** The control id, so clicking the label focuses the control. */
  readonly id?: string
  readonly errors: Array<{ message?: string } | undefined>
  /** `horizontal` puts the control on the right of the label, for switches and checkboxes. */
  readonly orientation?: 'vertical' | 'horizontal'
  readonly children: ReactNode
}

/**
 * The shell around one form control: label, required mark, description and error message.
 * Registered inputs use it internally; screens use it directly for a custom control.
 */
export function FormItem({
  id,
  label,
  description,
  required = false,
  hideDescriptionOnError = false,
  className,
  errors,
  orientation = 'vertical',
  children
}: FormItemProps) {
  const invalid = errors.length > 0
  const labelNode = label ? (
    <FieldLabel htmlFor={id}>
      {label}
      {required ? <RequiredMark /> : null}
    </FieldLabel>
  ) : null
  const showDescription = description && !(hideDescriptionOnError && errors.length > 0)
  const descriptionNode = showDescription ? <FieldDescription>{description}</FieldDescription> : null
  const errorNode = <FieldError errors={errors} />

  if (orientation === 'horizontal') {
    return (
      <Field orientation="horizontal" data-invalid={invalid} className={className}>
        <FieldContent>
          {labelNode}
          {descriptionNode}
          {errorNode}
        </FieldContent>
        {children}
      </Field>
    )
  }

  return (
    <Field data-invalid={invalid} className={className}>
      {labelNode}
      {children}
      {descriptionNode}
      {errorNode}
    </Field>
  )
}
