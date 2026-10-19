import type { ReactNode } from 'react'

import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'

import { RequiredMark } from './required-mark'

export interface TextFieldApi {
  state: { value: string; meta: { errors: Array<{ message?: string } | undefined> } }
  handleChange: (value: string) => void
  handleBlur: () => void
}

interface TextFieldProps {
  field: TextFieldApi
  label?: string
  description?: string
  required?: boolean
  placeholder?: string
  type?: string
  min?: number
  max?: number
  maxLength?: number
  multiline?: boolean
  rows?: number
  disabled?: boolean
  addonEnd?: ReactNode
}

export function TextField({
  field,
  label,
  description,
  required = false,
  placeholder,
  type,
  min,
  max,
  maxLength,
  multiline = false,
  rows,
  disabled = false,
  addonEnd
}: TextFieldProps) {
  const invalid = field.state.meta.errors.length > 0

  return (
    <Field data-invalid={invalid}>
      <FieldContent>
        <FieldLabel className="text-left">
          {label}
          {required && <RequiredMark />}
        </FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
      {multiline ? (
        <Textarea
          value={field.state.value}
          onChange={event => field.handleChange(event.target.value)}
          onBlur={field.handleBlur}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          required={required}
          aria-invalid={invalid}
          className="resize-none"
        />
      ) : (
        <InputGroup>
          <InputGroupInput
            type={type}
            min={min}
            max={max}
            maxLength={maxLength}
            value={field.state.value}
            onChange={event => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            aria-invalid={invalid}
          />
          {addonEnd && <InputGroupAddon align="inline-end">{addonEnd}</InputGroupAddon>}
        </InputGroup>
      )}
      <FieldError errors={field.state.meta.errors} />
    </Field>
  )
}
