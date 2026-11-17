import * as React from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cva } from 'class-variance-authority'
import { TriangleAlert } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { reportError } from '@/lib/http'

/** `danger` for deletes and kick-outs, `warning` for reversible-but-disruptive actions such as a secret reset. */
export type ConfirmTone = 'danger' | 'warning' | 'primary'

const mediaVariants = cva('', {
  variants: {
    tone: {
      danger: 'bg-destructive/10 text-destructive',
      warning: 'bg-status-warning/10 text-status-warning-foreground',
      primary: 'bg-primary/10 text-primary'
    }
  }
})

const actionVariants = cva('', {
  variants: {
    tone: {
      danger: '',
      // A literal amber-600: the status-warning token is too light to carry white text.
      warning: 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700',
      primary: ''
    }
  }
})

export interface ConfirmDialogProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title: React.ReactNode
  readonly description: React.ReactNode
  readonly tone?: ConfirmTone
  /** Defaults to a triangle alert. */
  readonly icon?: React.ReactNode
  readonly confirmLabel?: string
  readonly pendingLabel?: string
  /** The confirmed call; the mutation only starts when the confirm button is pressed. */
  readonly action: () => Promise<unknown>
  /** Query keys invalidated after a successful action. */
  readonly invalidateKeys?: ReadonlyArray<readonly unknown[]>
  /** `null` skips the success toast. */
  readonly successMessage?: string | null
  readonly errorMessage?: string
  /** Runs after the action succeeds, before the dialog closes (such as a page callback). */
  readonly onSuccess?: () => void
  readonly disabled?: boolean
  /** Hides the confirm button, for a record the action cannot apply to but that still shows the warning. */
  readonly showConfirm?: boolean
}

/**
 * The confirmation shared by every destructive or disruptive action: an alert dialog with a pending
 * state that blocks closing, and one place for the toast and cache invalidation. Screens keep their
 * own copy, icon, call and query keys.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  tone = 'danger',
  icon,
  confirmLabel = '确认',
  pendingLabel = '处理中',
  action,
  invalidateKeys,
  successMessage = '操作成功',
  errorMessage,
  onSuccess,
  disabled = false,
  showConfirm = true
}: ConfirmDialogProps) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => action(),
    onSuccess: () => {
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          void queryClient.invalidateQueries({ queryKey: key })
        }
      }
      if (successMessage) {
        toast.add({ title: successMessage, type: 'success' })
      }
      onSuccess?.()
      onClose()
    },
    onError: error => reportError(error, errorMessage)
  })

  return (
    <AlertDialog
      open={open}
      onOpenChange={nextOpen => {
        // Closing mid-request would leave the call in flight with no way to report it.
        if (!nextOpen && !mutation.isPending) {
          onClose()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className={mediaVariants({ tone })}>{icon ?? <TriangleAlert />}</AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>取消</AlertDialogCancel>
          {showConfirm ? (
            <AlertDialogAction
              variant={tone === 'danger' ? 'destructive' : 'default'}
              className={actionVariants({ tone })}
              disabled={mutation.isPending || disabled}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <>
                  <Spinner />
                  {pendingLabel}
                </>
              ) : (
                confirmLabel
              )}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
