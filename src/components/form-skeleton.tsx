import { cn } from 'cn'

import { Button } from '@/components/ui/button'
import { DrawerFooter } from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'

/** The shape of one placeholder row: an input, a textarea, or a switch row with its label on the left. */
export type FormSkeletonField = 'input' | 'textarea' | 'switch'

interface FormSkeletonProps {
  /** One entry per field, in screen order, so the placeholder matches the form it stands in for. */
  readonly fields: ReadonlyArray<FormSkeletonField>
  /** When set, draws the drawer footer: a working cancel button and a disabled save button. */
  readonly onCancel?: () => void
  readonly className?: string
}

/** The loading placeholder of an edit drawer while its record is fetched. */
export function FormSkeleton({ fields, onCancel, className }: FormSkeletonProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain p-4', className)}>
        <div className="flex flex-col gap-4">
          {fields.map((field, index) =>
            field === 'switch' ? (
              <div key={index} className="flex items-center justify-between py-1">
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-3.5 w-48" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ) : (
              <div key={index} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className={field === 'textarea' ? 'h-20 w-full' : 'h-9 w-full'} />
              </div>
            )
          )}
        </div>
      </div>

      {onCancel ? (
        <DrawerFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button disabled>保存</Button>
        </DrawerFooter>
      ) : null}
    </div>
  )
}
