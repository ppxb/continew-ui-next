import { createFormHook } from '@tanstack/react-form'

import { CustomField } from './custom-field'
import { fieldContext, formContext } from './form-context'
import { FormFooter } from './form-footer'
import { FormShell } from './form-shell'
import { NumberInput } from './number-input'
import { PasswordInput } from './password-input'
import { SelectInput } from './select-input'
import { SwitchInput } from './switch-input'
import { TextInput } from './text-input'
import { TextareaInput } from './textarea-input'

/**
 * The app's form hook. Use `useAppForm` in place of `useForm`, wrap the form in
 * `<form.AppForm><form.FormShell footer={<form.FormFooter />}>…</form.FormShell></form.AppForm>`,
 * then render registered inputs with `<form.AppField name="x">{field => <field.TextInput label="…" />}</form.AppField>`.
 */
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextInput,
    TextareaInput,
    PasswordInput,
    NumberInput,
    SelectInput,
    SwitchInput,
    CustomField
  },
  formComponents: {
    FormShell,
    FormFooter
  }
})

export { FormItem, type FormItemLabelProps } from './form-item'
export { useFieldControl } from './form-context'
export type { CustomFieldControl } from './custom-field'
export type { SelectOption } from './select-input'
