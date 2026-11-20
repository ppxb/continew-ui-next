import { Button } from '@/components/ui/button'
import { DrawerClose, DrawerFooter } from '@/components/ui/drawer'
import { Spinner } from '@/components/ui/spinner'

import { useFormContext } from './form-context'

interface FormFooterProps {
  readonly cancelText?: string
  readonly submitText?: string
  readonly submittingText?: string
}

/**
 * The drawer footer of an entity form: cancel and save. Cancel closes through the drawer, so an
 * edited form asks before discarding. Both buttons are disabled while the form submits, so the
 * drawer cannot close mid-request. Must render inside the `<form>` and `form.AppForm`.
 */
export function FormFooter({ cancelText = '取消', submitText = '保存', submittingText = '保存中' }: FormFooterProps) {
  const form = useFormContext()

  return (
    <DrawerFooter>
      <form.Subscribe selector={state => state.isSubmitting}>
        {isSubmitting => (
          <>
            <DrawerClose render={<Button type="button" variant="outline" disabled={isSubmitting} />}>
              {cancelText}
            </DrawerClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner />
                  {submittingText}
                </>
              ) : (
                submitText
              )}
            </Button>
          </>
        )}
      </form.Subscribe>
    </DrawerFooter>
  )
}
