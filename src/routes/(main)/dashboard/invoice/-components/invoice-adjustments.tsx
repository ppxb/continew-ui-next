import { useSelector } from '@tanstack/react-form'

import { Field, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { invoiceTaxOptions } from './data'
import type { InvoiceFormApi } from './use-invoice-form'

const taxItems = invoiceTaxOptions.map(taxOption => ({
  value: taxOption.id,
  label: `${taxOption.name} (${taxOption.rate}%)`
}))

const discountTypeItems = [
  { value: 'fixed', label: 'Fixed amount' },
  { value: 'percent', label: 'Percent' }
] as const

export function InvoiceAdjustments({ form }: { readonly form: InvoiceFormApi }) {
  const discountType = useSelector(form.store, state => state.values.discountType)

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-medium tracking-tight">Adjustments</h2>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <form.Field name="taxId">
          {field => (
            <Field className="gap-1">
              <FieldLabel className="text-xs">Tax</FieldLabel>
              <Select items={taxItems} value={field.state.value} onValueChange={field.handleChange}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select tax" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {taxItems.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <div className="grid grid-cols-[1fr_112px] gap-4">
          <form.Field name="discountType">
            {field => (
              <Field className="gap-1">
                <FieldLabel className="text-xs">Discount</FieldLabel>
                <Select
                  items={discountTypeItems}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Discount type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {discountTypeItems.map(item => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>
          <form.Field name="discountValue">
            {field => (
              <Field className="gap-1">
                <FieldLabel className="text-xs opacity-0">Value</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    type="number"
                    step="0.01"
                    aria-label="Discount value"
                    value={Number.isFinite(field.state.value) ? field.state.value : ''}
                    onChange={event => field.handleChange(event.target.valueAsNumber)}
                    onBlur={field.handleBlur}
                  />
                  <InputGroupAddon align="inline-end">{discountType === 'fixed' ? '$' : '%'}</InputGroupAddon>
                </InputGroup>
              </Field>
            )}
          </form.Field>
        </div>
      </div>
    </section>
  )
}
