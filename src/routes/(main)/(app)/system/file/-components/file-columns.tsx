import type { ReactNode } from 'react'

import { z } from 'zod'

import { CopyableText } from '@/components/copyable-text'
import type { ProColumns } from '@/components/pro'
import type { FileResp } from '@/lib/api/file'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { FileActions, type FileActionHandlers } from './file-actions'
import { FileTypeIcon, fileTypeLabel, formatFileSize } from './file-display'

export const fileNameRule = z
  .string()
  .trim()
  .min(1, '请输入名称')
  .refine(value => !/[\\/]/.test(value), '名称不能包含 / 或 \\')

export const fileColumns = [
  {
    title: 'ID',
    dataIndex: 'id',
    hideInTable: true,
    hideInForm: true,
    render: (_, file) => <CopyableText value={String(file.id)} />
  },
  {
    title: (_, type) => (type === 'descriptions' ? '原始名称' : '名称'),
    dataIndex: 'originalName',
    formItemProps: { rules: fileNameRule },
    fieldProps: { autoFocus: true, placeholder: '请输入名称' },
    render: (dom, _file, _index, _action, { type }) =>
      type === 'table' ? <span className="font-medium">{dom}</span> : dom
  },
  { title: '类型', dataIndex: 'type', hideInForm: true, render: (_, file) => fileTypeLabel(file.type) },
  {
    title: '大小',
    dataIndex: 'size',
    hideInForm: true,
    render: (_, file) => <span className="tabular-nums">{file.type === 0 ? '—' : formatFileSize(file.size)}</span>
  },
  { title: '扩展名', dataIndex: 'extension', hideInTable: true, hideInForm: true },
  { title: '内容类型', dataIndex: 'contentType', hideInTable: true, hideInForm: true },
  { title: '存储', dataIndex: 'storageName', hideInTable: true, hideInForm: true },
  {
    title: '路径',
    dataIndex: 'path',
    hideInTable: true,
    hideInForm: true,
    render: (_, file) => <CopyableText value={file.path} />
  },
  {
    title: 'SHA256',
    dataIndex: 'sha256',
    hideInTable: true,
    hideInForm: true,
    span: 2,
    render: (_, file) => (file.sha256 ? <CopyableText value={file.sha256} /> : EMPTY_PLACEHOLDER)
  },
  { title: '创建时间', dataIndex: 'createTime', hideInTable: true, hideInForm: true },
  { title: '修改时间', dataIndex: 'updateTime', hideInForm: true }
] as const satisfies readonly ProColumns<FileResp>[]

export function createFileTableColumns({
  canDownload,
  canUpdate,
  canDelete,
  handlers
}: {
  canDownload: boolean
  canUpdate: boolean
  canDelete: boolean
  handlers: FileActionHandlers
}): readonly ProColumns<FileResp>[] {
  return [
    ...fileColumns.map(column =>
      column.dataIndex === 'originalName'
        ? {
            ...column,
            render: (_: ReactNode, file: FileResp) => (
              <div className="flex min-w-0 items-center gap-2">
                <FileTypeIcon type={file.type} className="size-4 shrink-0 text-muted-foreground" />
                <button
                  type="button"
                  className="max-w-72 truncate text-left text-sm hover:underline"
                  onClick={() => (file.type === 0 ? handlers.onOpen(file) : handlers.onDetail(file))}
                >
                  {file.originalName}
                </button>
              </div>
            )
          }
        : column
    ),
    {
      title: <span className="sr-only">操作</span>,
      valueType: 'option',
      align: 'right',
      render: (_, file) => (
        <FileActions
          file={file}
          canDownload={canDownload}
          canUpdate={canUpdate}
          canDelete={canDelete}
          handlers={handlers}
        />
      )
    }
  ]
}

export function createFileNameColumns(isCreate: boolean) {
  return fileColumns.map(column =>
    column.dataIndex === 'originalName'
      ? {
          ...column,
          fieldProps: { autoFocus: true, placeholder: isCreate ? '请输入文件夹名称' : '请输入名称' }
        }
      : column
  ) satisfies readonly ProColumns<FileResp>[]
}
