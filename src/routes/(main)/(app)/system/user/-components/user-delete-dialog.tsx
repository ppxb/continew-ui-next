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
import { deleteUser, userKeys, type UserResp } from '@/lib/api/user'

import { userLabel } from './user-display'

interface UserDeleteDialogProps {
  /** The user being deleted, or `null` before the first one is picked. */
  readonly user: UserResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Confirms deleting one user.
 *
 * An alert dialog rather than a plain dialog, because the request cannot be undone and should
 * take a deliberate answer instead of a stray click. The wording follows the Vue client's
 * `onDelete`, and the row menu already blocks the action for the accounts the backend protects.
 */
export function UserDeleteDialog({ user, open, onClose }: UserDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (user === null) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteUser(user.id)

      onClose()
      // One prefix covers both the list and the cached detail.
      void queryClient.invalidateQueries({ queryKey: userKeys.all })
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
          <AlertDialogTitle>删除用户</AlertDialogTitle>
          <AlertDialogDescription>
            {user === null
              ? '是否确定删除该用户？删除后不可恢复。'
              : `是否确定删除用户「${userLabel(user)}(${user.username})」？删除后不可恢复。`}
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
