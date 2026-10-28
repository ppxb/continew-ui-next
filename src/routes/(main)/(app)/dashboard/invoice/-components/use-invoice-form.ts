import { useForm } from '@tanstack/react-form'

import { defaultInvoiceValues } from './data'

/**
 * One form instance for the whole page: the editor and the live preview read the same state, and
 * the item list needs the array helpers (`pushValue`, `moveValue`, `removeValue`) that only a field
 * API exposes.
 */
export function useInvoiceForm() {
  return useForm({ defaultValues: defaultInvoiceValues })
}

/** The shape children need to render a field; derived from the hook so it cannot drift. */
export type InvoiceFormApi = ReturnType<typeof useInvoiceForm>
