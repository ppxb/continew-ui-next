import { ConfirmDialog, type ConfirmDialogProps } from '@/components/confirm-dialog'

type DeleteConfirmDialogProps = Omit<ConfirmDialogProps, 'tone'>

/** `ConfirmDialog` with the delete defaults: danger tone, 「删除」 wording and 「删除成功」/「删除失败」 messages. */
export function DeleteConfirmDialog({
  confirmLabel = '删除',
  pendingLabel = '删除中',
  successMessage = '删除成功',
  errorMessage = '删除失败',
  ...props
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      {...props}
      tone="danger"
      confirmLabel={confirmLabel}
      pendingLabel={pendingLabel}
      successMessage={successMessage}
      errorMessage={errorMessage}
    />
  )
}
