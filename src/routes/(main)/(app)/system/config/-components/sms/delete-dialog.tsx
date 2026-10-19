import * as React from 'react'

import { useQueryClient } from '@tanstack/react-query'
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
import { deleteSmsConfigs, type SmsConfigResp } from '@/lib/api/sms'
import { smsKeys } from '@/lib/query-keys'

interface SmsDeleteDialogProps {
  readonly sms: SmsConfigResp | null
  readonly open: boolean
  readonly onClose: () => void
}

export function SmsDeleteDialog({ sms, open, onClose }: SmsDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!sms) return

    setIsDeleting(true)
    try {
      await deleteSmsConfigs([sms.id])
      toast.add({
        title: '删除配置成功',
        type: 'success'
      })
      onClose()
      void queryClient.invalidateQueries({ queryKey: smsKeys.all })
    } catch {
      // Handled by HTTP layer
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && !isDeleting) {
          onClose()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <TriangleAlert />
          </AlertDialogMedia>
          <AlertDialogTitle>删除短信配置</AlertDialogTitle>
          <AlertDialogDescription>
            {`确定要删除短信配置「${sms?.name ?? ''}」吗？操作不可撤销。`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting || !sms}
            onClick={() => void handleDelete()}
          >
            {isDeleting ? (
              <>
                <Spinner />
                删除中
              </>
            ) : (
              '确定删除'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
