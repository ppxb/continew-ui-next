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
import { deleteTenant, tenantKeys, type TenantResp } from '@/lib/api/tenant'

interface TenantDeleteDialogProps {
  /** The tenant being deleted, or `null` before the first one is picked. */
  readonly tenant: TenantResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Confirms deleting one tenant.
 *
 * The row menu already blocks the action for the records the backend protects, and the
 * request clears every row the tenant owns, so it takes a deliberate answer.
 */
export function TenantDeleteDialog({ tenant, open, onClose }: TenantDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = React.useState(false)

  // The parent clears `tenant` when the dialog closes, but the exit animation keeps rendering
  // this copy, so the name would vanish mid-close. `tenant` still wins while it is set.
  const [lastTenant, setLastTenant] = React.useState<TenantResp | null>(null)

  React.useEffect(() => {
    if (tenant) {
      setLastTenant(tenant)
    }
  }, [tenant])

  const shownTenant = tenant ?? lastTenant

  const handleDelete = async () => {
    if (tenant === null) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteTenant(tenant.id)

      onClose()
      void queryClient.invalidateQueries({ queryKey: tenantKeys.all })
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
          <AlertDialogTitle>删除租户</AlertDialogTitle>
          <AlertDialogDescription>
            {shownTenant
              ? `是否确定删除租户「${shownTenant.name}（${shownTenant.code}）」？该租户的数据会一并清除，删除后不可恢复`
              : '是否确定删除该租户？删除后不可恢复'}
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
