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
import { deleteDict, deleteDictItem, dictKeys, type DictItemResp, type DictResp } from '@/lib/api/dict'

export type DictDeleteTarget = { type: 'dict'; dict: DictResp } | { type: 'item'; item: DictItemResp }

interface DictDeleteDialogProps {
  readonly target: DictDeleteTarget | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Confirms deleting a dictionary (with its items) or one dictionary item. */
export function DictDeleteDialog({ target, open, onClose }: DictDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = React.useState(false)
  // Keep the last target during the close animation, where `target` is already null.
  const shownTarget = useLastRecord(target)

  const description =
    shownTarget === null
      ? '是否确定删除该数据？删除后不可恢复'
      : shownTarget.type === 'dict'
        ? `是否确定删除字典「${shownTarget.dict.name}」？其下所有字典项也会一并删除`
        : `是否确定删除字典项「${shownTarget.item.label}」？`

  const handleDelete = async () => {
    if (target === null) {
      return
    }

    setIsDeleting(true)

    try {
      if (target.type === 'dict') {
        await deleteDict(target.dict.id)
        void queryClient.invalidateQueries({ queryKey: dictKeys.lists() })
        void queryClient.invalidateQueries({ queryKey: dictKeys.items() })
      } else {
        await deleteDictItem(target.item.id)
        void queryClient.invalidateQueries({ queryKey: dictKeys.items() })
      }

      toast.add({ title: '删除成功', type: 'success' })
      onClose()
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
          <AlertDialogTitle>{shownTarget?.type === 'dict' ? '删除字典' : '删除字典项'}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
