import { useSelector } from '@tanstack/react-form'

import { InvoiceForm } from './invoice-form'
import { InvoicePreview } from './invoice-preview'
import { useInvoiceForm } from './use-invoice-form'

export function Invoice() {
  const form = useInvoiceForm()

  // One subscription for the whole page: the preview re-renders on every edit, exactly like the
  // `useWatch` it replaces.
  const invoice = useSelector(form.store, state => state.values)

  return (
    <form className="grid gap-5 xl:grid-cols-2" noValidate onSubmit={event => event.preventDefault()}>
      <InvoiceForm form={form} />
      <InvoicePreview invoice={invoice} />
    </form>
  )
}
