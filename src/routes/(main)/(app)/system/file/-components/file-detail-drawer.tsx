import { EntityDrawer } from '@/components/entity-drawer'
import { ProDescriptions } from '@/components/pro'
import { useLastRecord } from '@/hooks/use-last-record'
import type { FileResp } from '@/lib/api/file'

import { fileColumns } from './file-columns'
import { FileTypeIcon } from './file-display'

interface FileDetailDrawerProps {
  /** The row that was clicked; the API has no detail endpoint. */
  readonly file: FileResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Read-only field panel for one file or folder. */
export function FileDetailDrawer({ file, open, onClose }: FileDetailDrawerProps) {
  // Keep the last file during the exit animation, because the parent clears the prop when it closes.
  const shownFile = useLastRecord(file)

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

            <ProDescriptions columns={fileColumns} dataSource={shownFile} />
          </div>
        ) : null}
      </div>
    </EntityDrawer>
  )
}
