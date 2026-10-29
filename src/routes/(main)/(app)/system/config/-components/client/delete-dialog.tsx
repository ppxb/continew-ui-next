import { useMutation, useQueryClient } from '@tanstack/react-query'

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
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useLastRecord } from '@/hooks/use-last-record'
import { deleteClients, type ClientResp } from '@/lib/api/client'
import { reportError } from '@/lib/http'
import { clientKeys } from '@/lib/query-keys'

interface ClientDeleteDialogProps {
  readonly client: ClientResp | null
  readonly open: boolean
  readonly onClose: () => void
}

export function ClientDeleteDialog({ client, open, onClose }: ClientDeleteDialogProps) {
  const queryClient = useQueryClient()
  // Keep the client named after the dialog starts closing and `client` is already null.
  const shownClient = useLastRecord(client)

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteClients([id]),
    onSuccess: () => {
      toast.add({ title: '删除客户端成功', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: clientKeys.all })
      onClose()
    },
    onError: err => reportError(err, '删除失败')
  })

  return (
    <AlertDialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除客户端配置</AlertDialogTitle>
          <AlertDialogDescription>
            确认删除客户端「{shownClient?.clientId}」吗？删除后相关客户端将无法从此通道换取 Token 或调用系统接口。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => client && deleteMutation.mutate(client.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && <Spinner />}
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
