import * as React from 'react'

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
import { deleteFiles, type FileResp } from '@/lib/api/file'

interface FileDeleteDialogProps {
  readonly file: FileResp | null
  readonly open: boolean
  readonly onClose: () => void
  readonly onCompleted: () => void
}

/** Confirms deleting one file or folder. */
export function FileDeleteDialog({ file, open, onClose, onCompleted }: FileDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [lastFile, setLastFile] = React.useState<FileResp | null>(null)

  React.useEffect(() => {
    if (file) {
      setLastFile(file)
    }
  }, [file])

  const shownFile = file ?? lastFile

  const handleDelete = async () => {
    if (!file) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteFiles([file.id])
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
          <AlertDialogTitle>{shownFile?.type === 0 ? '删除文件夹' : '删除文件'}</AlertDialogTitle>
          <AlertDialogDescription>
            {shownFile
              ? `是否确定删除${shownFile.type === 0 ? '文件夹' : '文件'}「${shownFile.originalName}」？`
              : '是否确定删除该项？'}
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
