import * as React from 'react'

import { useQueryClient } from '@tanstack/react-query'

import { Trash2 } from 'lucide-react'

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
import { useLastRecord } from '@/hooks/use-last-record'
import { deleteSmsLog, smsLogKeys, type SmsLogResp } from '@/lib/api/sms-log'

interface SmsLogDeleteDialogProps {
  /** The log being deleted, or `null` before the first one is picked. */
  readonly log: SmsLogResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Confirms deleting one SMS log; the rows the backend protects never reach the dialog.
 */
export function SmsLogDeleteDialog({ log, open, onClose }: SmsLogDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = React.useState(false)
  const shownLog = useLastRecord(log)

  const handleDelete = async () => {
    if (log === null) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteSmsLog(log.id)

      onClose()
      void queryClient.invalidateQueries({ queryKey: smsLogKeys.all })
      toast.add({ title: '删除成功', type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={nextOpen => {
        // Closing mid-delete would leave the request in flight with no way to report it.
        if (!nextOpen && !isDeleting) {
          onClose()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>删除短信日志</AlertDialogTitle>
          <AlertDialogDescription>
            {shownLog?.phone
              ? `是否确定删除手机号为「${shownLog.phone}」的短信日志？删除后不可恢复`
              : '是否确定删除该条短信日志？删除后不可恢复'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={() => void handleDelete()}>
            {isDeleting ? (
              <>
                <Spinner />
                删除中
              </>
            ) : (
              '删除'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
