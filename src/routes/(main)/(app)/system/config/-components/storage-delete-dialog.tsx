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
import { deleteStorages, type StorageResp } from '@/lib/api/storage'
import { storageKeys } from '@/lib/query-keys'

interface StorageDeleteDialogProps {
  /** The storage being deleted, or `null` before the first one is picked. */
  readonly storage: StorageResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Confirms deleting one storage.
 *
 * An alert dialog rather than a plain dialog, because the request cannot be undone and should take
 * a deliberate answer instead of a stray click. The backend refuses to delete a storage that still
 * has files associated with it, or that is the default one, and reports why.
 */
export function StorageDeleteDialog({ storage, open, onClose }: StorageDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (storage === null) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteStorages([storage.id])

      onClose()
      void queryClient.invalidateQueries({ queryKey: storageKeys.all })
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
            <TriangleAlert />
          </AlertDialogMedia>
          <AlertDialogTitle>删除存储</AlertDialogTitle>
          <AlertDialogDescription>
            {storage === null
              ? '是否确定删除该存储配置？删除后不可恢复。'
              : `是否确定删除存储配置「${storage.name}(${storage.code})」？删除后不可恢复，已上传至该存储的文件将无法访问。`}
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
