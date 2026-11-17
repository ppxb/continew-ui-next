import { useMemo } from 'react'

import { ProTable } from '@/components/pro'
import { fileKeys, type FileResp } from '@/lib/api/file'

import type { FileActionHandlers } from './file-actions'
import { createFileTableColumns } from './file-columns'

interface FileTableProps {
  readonly files: FileResp[]
  readonly canDownload: boolean
  readonly canUpdate: boolean
  readonly canDelete: boolean
  readonly handlers: FileActionHandlers
}

/** The list mode, using the same data and actions as the grid. */
export function FileTable({ files, canDownload, canUpdate, canDelete, handlers }: FileTableProps) {
  const columns = useMemo(() => createFileTableColumns({ canDownload, canUpdate, canDelete, handlers }), [canDownload, canUpdate, canDelete, handlers])
  return (
    <ProTable<FileResp>
      columns={columns}
      rowKey="id"
      queryKey={fileKeys.all}
      dataSource={files}
      pagination={false}
      cardProps={false}
      options={false}
      embedded
      search={false}
      tableClassName="[&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:font-normal [&_tr>:nth-child(2)]:hidden md:[&_tr>:nth-child(2)]:table-cell [&_tr>:nth-child(3)]:hidden sm:[&_tr>:nth-child(3)]:table-cell [&_tr>:nth-child(4)]:hidden lg:[&_tr>:nth-child(4)]:table-cell [&_tr>:last-child]:w-20"
    />
  )
}
