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
import { deleteRoles, roleKeys, type RoleResp } from '@/lib/api/role'

interface RoleDeleteDialogProps {
  /** The role being deleted, or `null` before the first one is picked. */
  readonly role: RoleResp | null
  readonly open: boolean
  readonly onClose: () => void
}

export function RoleDeleteDialog({ role, open, onClose }: RoleDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!role) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteRoles([role.id])

      toast.add({ title: '删除角色成功', type: 'success' })
      onClose()
      void queryClient.invalidateQueries({ queryKey: roleKeys.all })
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
          <AlertDialogTitle>删除角色</AlertDialogTitle>
          <AlertDialogDescription>
            {`确定要删除角色「${role?.name ?? ''}」吗？删除后该角色下关联的用户权限将失效，操作不可撤回。`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isDeleting || !role} onClick={() => void handleDelete()}>
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
