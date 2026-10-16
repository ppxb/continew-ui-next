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
import { appKeys, type AppResp, deleteApp } from '@/lib/api/app'

interface AppDeleteDialogProps {
  /** The app being deleted, or `null` before one is selected. */
  readonly app: AppResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Confirms deleting one app.
 */
export function AppDeleteDialog({ app, open, onClose }: AppDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (app === null) return

    setIsDeleting(true)

    try {
      await deleteApp(app.id)

      onClose()
      void queryClient.invalidateQueries({ queryKey: appKeys.all })
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
          <AlertDialogTitle>删除应用</AlertDialogTitle>
          <AlertDialogDescription>
            {app === null
              ? '是否确定删除该应用？删除后不可恢复。'
              : `是否确定删除应用「${app.name}」？删除后不可恢复。`}
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
