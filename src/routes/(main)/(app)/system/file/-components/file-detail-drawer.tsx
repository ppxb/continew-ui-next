import * as React from 'react'
import type { ReactNode } from 'react'

import { cn } from 'cn'

import { CopyableText } from '@/components/copyable-text'
import { EntityDrawer } from '@/components/entity-drawer'
import type { FileResp } from '@/lib/api/file'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { FileTypeIcon, fileTypeLabel, formatFileSize } from './file-display'

function DetailField({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm wrap-break-word text-foreground">{children}</dd>
    </div>
  )
}

interface FileDetailDrawerProps {
  /** The row that was clicked; the API has no detail endpoint. */
  readonly file: FileResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Read-only field panel for one file or folder. */
export function FileDetailDrawer({ file, open, onClose }: FileDetailDrawerProps) {
  // Keep a copy for the exit animation, because the parent clears the prop when it closes.
  const [lastFile, setLastFile] = React.useState<FileResp | null>(null)

  React.useEffect(() => {
    if (file) {
      setLastFile(file)
    }
  }, [file])

  const shownFile = file ?? lastFile

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title="文件详情"
      icon={<FileTypeIcon type={shownFile?.type} className="size-4" />}
      width={38}
    >

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {shownFile ? (
            <div className="flex flex-col gap-4">
              {shownFile.type === 2 && shownFile.url ? (
                <img
                  src={shownFile.url}
                  alt={shownFile.originalName}
                  className="max-h-48 w-full rounded-lg border bg-muted/30 object-contain"
                />
              ) : null}

              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <DetailField label="ID">
                  <CopyableText value={String(shownFile.id)} />
                </DetailField>
                <DetailField label="原始名称">{shownFile.originalName || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="类型">{fileTypeLabel(shownFile.type)}</DetailField>
                <DetailField label="大小">{shownFile.type === 0 ? '—' : formatFileSize(shownFile.size)}</DetailField>
                <DetailField label="扩展名">{shownFile.extension || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="内容类型">{shownFile.contentType || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="存储">{shownFile.storageName || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="路径">
                  <CopyableText value={shownFile.path} />
                </DetailField>
                <DetailField label="SHA256" className="sm:col-span-2">
                  {shownFile.sha256 ? <CopyableText value={shownFile.sha256} /> : EMPTY_PLACEHOLDER}
                </DetailField>
                <DetailField label="创建时间">{shownFile.createTime || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="修改时间">{shownFile.updateTime || EMPTY_PLACEHOLDER}</DetailField>
              </dl>
            </div>
          ) : null}
        </div>
    </EntityDrawer>
  )
}
