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
import { deleteDict, deleteDictItem, dictKeys, type DictItemResp, type DictResp } from '@/lib/api/dict'

export type DictDeleteTarget = { type: 'dict'; dict: DictResp } | { type: 'item'; item: DictItemResp }

interface DictDeleteDialogProps {
  readonly target: DictDeleteTarget | null
  readonly open: boolean
  readonly onClose: () => void
  readonly onCompleted: () => void
}

/** Confirms deleting a dictionary (with its items) or one dictionary item. */
export function DictDeleteDialog({ target, open, onClose, onCompleted }: DictDeleteDialogProps) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [lastTarget, setLastTarget] = React.useState<DictDeleteTarget | null>(null)

  React.useEffect(() => {
    if (target) {
      setLastTarget(target)
    }
  }, [target])

  const shownTarget = target ?? lastTarget
  const isDict = shownTarget?.type === 'dict'
  const name = shownTarget?.type === 'dict' ? shownTarget.dict.name : shownTarget?.item.label

  const handleDelete = async () => {
    if (!target) {
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
      onCompleted()
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
          <AlertDialogTitle>{isDict ? '删除字典' : '删除字典项'}</AlertDialogTitle>
          <AlertDialogDescription>
            {isDict
              ? `是否确定删除字典「${name ?? ''}」？其下所有字典项也会一并删除`
              : `是否确定删除字典项「${name ?? ''}」？`}
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
