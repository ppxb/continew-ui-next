import { RestrictToVerticalAxis } from '@dnd-kit/abstract/modifiers'
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { cn } from 'cn'
import { GripVertical, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'

import { getLineAmount, type InvoiceLineItem } from './data'
import type { InvoiceFormApi } from './use-invoice-form'

export function InvoiceItems({ form }: { readonly form: InvoiceFormApi }) {
  return (
    <form.Field name="items" mode="array">
      {itemsField => {
        const items = itemsField.state.value

        function handleDragEnd(event: DragEndEvent) {
          const { source } = event.operation

          if (event.canceled || !isSortable(source) || source.initialIndex === source.index) {
            return
          }

          itemsField.moveValue(source.initialIndex, source.index)
        }

        function handleAddItem() {
          itemsField.pushValue({ id: `item-${Date.now()}`, description: '', quantity: 1, unitPrice: 0 })
        }

        return (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium tracking-tight">Invoice Items</h2>
              <Button type="button" variant="ghost" size="sm" onClick={handleAddItem}>
                <Plus data-icon="inline-start" />
                Add Item
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="hidden items-center gap-2 px-1 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[24px_minmax(0,1fr)_64px_112px_112px_32px]">
                <span />
                <span>Description</span>
                <span className="px-2">Units</span>
                <span className="px-2">Unit cost</span>
                <span className="text-right">Line Total</span>
                <span />
              </div>

              <DragDropProvider onDragEnd={handleDragEnd}>
                <div className="flex flex-col gap-3">
                  {items.map((item, index) => (
                    <SortableInvoiceItemRow
                      key={item.id}
                      id={item.id}
                      index={index}
                      item={item}
                      form={form}
                      onRemove={() => itemsField.removeValue(index)}
                    />
                  ))}
                </div>
              </DragDropProvider>
            </div>
          </section>
        )
      }}
    </form.Field>
  )
}

function SortableInvoiceItemRow({
  id,
  index,
  item,
  form,
  onRemove
}: {
  id: string
  index: number
  item: InvoiceLineItem
  form: InvoiceFormApi
  onRemove: () => void
}) {
  const { handleRef, isDragging, ref } = useSortable({
    id,
    index,
    type: 'invoice-item',
    accept: 'invoice-item',
    group: 'invoice-items',
    modifiers: [RestrictToVerticalAxis]
  })

  return (
    <div
      ref={ref}
      className={cn(
        'grid min-w-0 grid-cols-[24px_minmax(0,0.8fr)_minmax(0,1fr)_32px] items-center gap-2 rounded-lg md:grid-cols-[24px_minmax(0,1fr)_64px_112px_112px_32px]',
        isDragging && 'relative z-10 opacity-50'
      )}
    >
      <Button
        ref={handleRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        className="-ml-2 cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label={`Reorder ${id}`}
      >
        <GripVertical />
      </Button>
      <form.Field name={`items[${index}].description`}>
        {field => (
          <Input
            className="min-w-0 text-sm max-md:col-span-3"
            aria-label={`Item ${index + 1} description`}
            value={field.state.value}
            onChange={event => field.handleChange(event.target.value)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
      <form.Field name={`items[${index}].quantity`}>
        {field => (
          <Input
            type="number"
            step="1"
            className="text-sm max-md:col-start-2 max-md:row-start-2"
            aria-label={`Item ${index + 1} quantity`}
            value={Number.isFinite(field.state.value) ? field.state.value : ''}
            onChange={event => field.handleChange(event.target.valueAsNumber)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
      <form.Field name={`items[${index}].unitPrice`}>
        {field => (
          <Input
            type="number"
            step="0.01"
            className="text-sm max-md:col-start-3 max-md:row-start-2"
            aria-label={`Item ${index + 1} unit price`}
            value={Number.isFinite(field.state.value) ? field.state.value : ''}
            onChange={event => field.handleChange(event.target.valueAsNumber)}
            onBlur={field.handleBlur}
          />
        )}
      </form.Field>
      <div className="min-w-0 text-right text-sm font-medium max-md:col-span-3 max-md:col-start-2 max-md:row-start-3 max-md:flex max-md:items-center max-md:justify-between max-md:text-left">
        <span className="hidden text-muted-foreground max-md:inline">Line total</span>
        <span>{formatInvoiceCurrency(getLineAmount(item))}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="max-md:col-start-4 max-md:row-start-2"
        aria-label={`Remove item ${index + 1}`}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

function formatInvoiceCurrency(value: number) {
  return formatCurrency(Number.isFinite(value) ? value : 0, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
