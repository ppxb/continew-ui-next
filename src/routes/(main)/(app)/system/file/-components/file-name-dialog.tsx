import * as React from 'react'

import { BetaSchemaForm, type ProFormInstance } from '@/components/pro'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { createDir, updateFile, type FileResp } from '@/lib/api/file'

import { createFileNameColumns } from './file-columns'

type FileNameDialogMode = 'createDir' | 'rename'

interface FileNameDialogProps {
  readonly open: boolean
  readonly mode: FileNameDialogMode
  /** The folder that receives a new directory, or the file's own parent path when renaming. */
  readonly parentPath: string
  readonly file?: FileResp | null
  readonly onClose: () => void
  readonly onCompleted: () => void
}

/** Creates a directory or renames a file, both of which are just a name in this API. */
export function FileNameDialog({ open, mode, parentPath, file, onClose, onCompleted }: FileNameDialogProps) {
  const formRef = React.useRef<ProFormInstance>(undefined)
  const isCreate = mode === 'createDir'
  const columns = React.useMemo(() => createFileNameColumns(isCreate), [isCreate])

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && !formRef.current?.isSubmitting) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCreate ? '新建文件夹' : '重命名'}</DialogTitle>
          <DialogDescription>
            {isCreate ? `在 ${parentPath === '/' ? '根目录' : parentPath} 下创建文件夹` : '修改文件或文件夹的显示名称'}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <BetaSchemaForm<FileResp, typeof columns>
            key={`${mode}:${String(file?.id ?? '')}:${parentPath}`}
            layoutType="Form"
            columns={columns}
            formRef={formRef}
            initialValues={{ originalName: isCreate ? '' : (file?.originalName ?? '') }}
            onFinish={async values => {
              if (!isCreate && !file) return false
              const originalName = values.originalName
              if (isCreate) await createDir(parentPath, originalName)
              else if (file) await updateFile(file.id, { originalName, parentPath: file.parentPath })
              toast.add({ title: isCreate ? '创建成功' : '修改成功', type: 'success' })
              onCompleted()
              onClose()
              return true
            }}
            submitter={{
              render: ({ isSubmitting }) => (
                <DialogFooter>
                  <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
                    取消
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Spinner />
                        {isCreate ? '创建中' : '保存中'}
                      </>
                    ) : isCreate ? (
                      '创建'
                    ) : (
                      '保存'
                    )}
                  </Button>
                </DialogFooter>
              )
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
