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
import { deletePackage, packageKeys, type PackageResp } from '@/lib/api/package'
import { tenantKeys } from '@/lib/api/tenant'

interface PackageDeleteDialogProps {
  /** The package being deleted, or `null` before the first one is picked. */
  readonly pkg: PackageResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Confirms deleting one package; the backend rejects one that still has tenants. */
export function PackageDeleteDialog({ pkg, open, onClose }: PackageDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = React.useState(false)

  // The parent clears `pkg` when the dialog closes, but the exit animation keeps rendering
  // this copy, so the name would vanish mid-close. `pkg` still wins while it is set.
  const [lastPackage, setLastPackage] = React.useState<PackageResp | null>(null)

  React.useEffect(() => {
    if (pkg) {
      setLastPackage(pkg)
    }
  }, [pkg])

  const shownPackage = pkg ?? lastPackage

  const handleDelete = async () => {
    if (pkg === null) {
      return
    }

    setIsDeleting(true)

    try {
      await deletePackage(pkg.id)

      onClose()
      void queryClient.invalidateQueries({ queryKey: packageKeys.all })
      // The tenant list shows the package name, so it goes stale with the package.
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
          <AlertDialogTitle>删除套餐</AlertDialogTitle>
          <AlertDialogDescription>
            {shownPackage
              ? `是否确定删除套餐「${shownPackage.name}」？删除后不可恢复`
              : '是否确定删除该套餐？删除后不可恢复'}
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
