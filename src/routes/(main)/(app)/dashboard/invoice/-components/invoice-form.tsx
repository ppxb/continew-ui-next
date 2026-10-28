import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { ClientSelector } from './client-selector'
import { InvoiceAdjustments } from './invoice-adjustments'
import { InvoiceDetails } from './invoice-details'
import { InvoiceItems } from './invoice-items'
import type { InvoiceFormApi } from './use-invoice-form'

export function InvoiceForm({ form }: { readonly form: InvoiceFormApi }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <Tabs defaultValue="invoice">
        <TabsList className="w-full">
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>
      </Tabs>

      <InvoiceDetails form={form} />

      <Separator />

      <ClientSelector form={form} />

      <Separator />

      <InvoiceItems form={form} />

      <Separator />

      <InvoiceAdjustments form={form} />
    </div>
  )
}
