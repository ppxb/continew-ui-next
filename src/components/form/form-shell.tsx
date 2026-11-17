import { useRef, type ReactNode } from 'react'

import { cn } from 'cn'

import { useFormContext } from './form-context'

interface FormShellProps {
  /** The fields, rendered in the scrollable area. */
  readonly children: ReactNode
  /** Rendered below the scrollable area, usually `<form.FormFooter onCancel={onClose} />`. */
  readonly footer?: ReactNode
  /** Classes for the scrollable area. */
  readonly className?: string
}

/**
 * The `<form>` of a drawer: a scrollable field area above a fixed footer. Submitting runs the
 * object validator first, since `handleSubmit` stops at field errors and would hide form-level
 * ones, then moves focus to the first invalid control, which TanStack Form does not do.
 * Must render inside `form.AppForm`.
 */
export function FormShell({ children, footer, className }: FormShellProps) {
  const form = useFormContext()
  const formRef = useRef<HTMLFormElement>(null)

  const submit = async () => {
    await form.validate('submit')
    await form.handleSubmit()

    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  return (
    <form
      ref={formRef}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={event => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain p-4', className)}>{children}</div>
      {footer}
    </form>
  )
}
