import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { toast } from '@/components/ui/toast'
import { deleteNotice, noticeKeys, type NoticeResp } from '@/lib/api/notice'

interface NoticeDeleteDialogProps {
  readonly notice: NoticeResp | null
  readonly open: boolean
  readonly onClose: () => void
  readonly onCompleted: () => void
}

export function NoticeDeleteDialog({ notice, open, onClose, onCompleted }: NoticeDeleteDialogProps) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => deleteNotice(notice?.id ?? ''),
    onSuccess: () => {
      toast.add({ title: '删除成功', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: noticeKeys.lists() })
      onCompleted()
      onClose()
    }
  })

  return (
    <AlertDialog open={open} onOpenChange={next => (!next && !deleteMutation.isPending ? onClose() : undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除公告</AlertDialogTitle>
          <AlertDialogDescription>是否确定删除公告「{notice?.title}」？删除后不可恢复。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={event => {
              event.preventDefault()
              deleteMutation.mutate()
            }}
          >
            {deleteMutation.isPending ? <Spinner /> : null}
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
