import type { ColumnDef } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import type { LogResp } from '@/lib/api/log'
import type { DataTableFeatures } from '@/lib/data-table-features'

import { LogStatusCell, TextCell, TimeTakenCell } from './log-display'

interface OperationColumnOptions {
  /** The index of the first row on the current page, so 序号 stays continuous. */
  readonly rowOffset: number
  /** Opening a detail needs `monitor:log:get`; without it the time stays plain text. */
  readonly canViewDetail: boolean
  readonly onDetail: (log: LogResp) => void
}

/**
 * The labels of the columns whose header renders a centered node.
 *
 * The hide-columns menu reads `columnDef.header` for its entries, and a rendered node
 * cannot supply text, so it falls back to this map.
 */
export const LOG_COLUMN_LABELS: Record<string, string> = {
  status: '状态',
  module: '所属模块',
  timeTaken: '耗时'
}

function indexColumn(rowOffset: number): ColumnDef<DataTableFeatures, LogResp> {
  return {
    id: 'index',
    header: '序号',
    enableHiding: false,
    cell: ({ row }) => (
      <div className="text-center text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
    )
  }
}

function statusColumn(): ColumnDef<DataTableFeatures, LogResp> {
  return {
    id: 'status',
    header: () => <div className="text-center">状态</div>,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <LogStatusCell status={row.original.status} errorMsg={row.original.errorMsg} />
      </div>
    )
  }
}

function ipColumns(ipHeader: string, addressHeader: string): ColumnDef<DataTableFeatures, LogResp>[] {
  return [
    {
      accessorKey: 'ip',
      header: ipHeader,
      cell: ({ row }) => <TextCell value={row.original.ip} />
    },
    {
      accessorKey: 'address',
      header: addressHeader,
      cell: ({ row }) => <TextCell value={row.original.address} />
    }
  ]
}

function clientColumns(): ColumnDef<DataTableFeatures, LogResp>[] {
  return [
    {
      accessorKey: 'browser',
      header: '浏览器',
      cell: ({ row }) => <TextCell value={row.original.browser} />
    },
    {
      accessorKey: 'os',
      header: '终端系统',
      cell: ({ row }) => <TextCell value={row.original.os} />
    }
  ]
}

/** Login rows: who signed in, what they did and where the request came from. */
export function createLoginLogColumns(rowOffset: number) {
  return [
    indexColumn(rowOffset),
    {
      accessorKey: 'createTime',
      header: '登录时间',
      cell: ({ row }) => <TextCell value={row.original.createTime} />
    },
    {
      accessorKey: 'createUserString',
      header: '用户昵称',
      cell: ({ row }) => <TextCell value={row.original.createUserString} />
    },
    {
      accessorKey: 'description',
      header: '登录行为',
      cell: ({ row }) => <TextCell value={row.original.description} />
    },
    statusColumn(),
    ...ipColumns('登录 IP', '登录地点'),
    ...clientColumns()
  ] satisfies ColumnDef<DataTableFeatures, LogResp>[]
}

/** Operation rows add the module and the request duration, and open a detail drawer. */
export function createOperationLogColumns({ rowOffset, canViewDetail, onDetail }: OperationColumnOptions) {
  return [
    indexColumn(rowOffset),
    {
      accessorKey: 'createTime',
      header: '操作时间',
      cell: ({ row }) =>
        canViewDetail ? (
          <Button variant="link" className="h-auto p-0 text-sm font-normal" onClick={() => onDetail(row.original)}>
            {row.original.createTime}
          </Button>
        ) : (
          <TextCell value={row.original.createTime} />
        )
    },
    {
      accessorKey: 'createUserString',
      header: '操作人',
      cell: ({ row }) => <TextCell value={row.original.createUserString} />
    },
    {
      accessorKey: 'description',
      header: '操作内容',
      cell: ({ row }) => <TextCell value={row.original.description} />
    },
    {
      accessorKey: 'module',
      header: () => <div className="text-center">所属模块</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <TextCell value={row.original.module} />
        </div>
      )
    },
    statusColumn(),
    ...ipColumns('操作 IP', '操作地点'),
    {
      accessorKey: 'timeTaken',
      header: () => <div className="text-center">耗时</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <TimeTakenCell timeTaken={row.original.timeTaken} />
        </div>
      )
    },
    ...clientColumns()
  ] satisfies ColumnDef<DataTableFeatures, LogResp>[]
}
