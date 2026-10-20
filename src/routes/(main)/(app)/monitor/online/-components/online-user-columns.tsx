import type { ColumnDef } from '@tanstack/react-table'
import { LogOut } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { OnlineUserResp } from '@/lib/api/online'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import type { DataTableFeatures } from '@/lib/data-table-features'

interface OnlineUserColumnOptions {
  /** The index of the first row on the current page, so 序号 stays continuous. */
  readonly rowOffset: number
  /** The signed-in account may not hold `monitor:online:kickout`; the column is dropped then. */
  readonly canKickout: boolean
  /** The backend rejects kicking out the session that sends the request. */
  readonly isCurrentSession: (sessionId: string) => boolean
  readonly onKickout: (user: OnlineUserResp) => void
}

function TextCell({ value }: { value: string }) {
  return <span className="text-sm">{value || EMPTY_PLACEHOLDER}</span>
}

function UserCell({ user }: { user: OnlineUserResp }) {
  const name = user.nickname || user.username
  const showUsername = Boolean(user.username) && user.username !== name

  return (
    <div className="flex flex-col">
      <span className="truncate text-sm font-medium text-foreground">{name || EMPTY_PLACEHOLDER}</span>
      {showUsername ? <span className="truncate text-xs text-muted-foreground">{user.username}</span> : null}
    </div>
  )
}

function KickoutCell({
  user,
  isCurrentSession,
  onKickout
}: {
  user: OnlineUserResp
  isCurrentSession: (sessionId: string) => boolean
  onKickout: (user: OnlineUserResp) => void
}) {
  return (
    <div className="flex items-center justify-center">
      {isCurrentSession(user.sessionId) ? (
        <Badge variant="secondary" className="font-normal">
          当前会话
        </Badge>
      ) : (
        <Button variant="destructive" size="sm" onClick={() => onKickout(user)}>
          <LogOut />
          强退
        </Button>
      )}
    </div>
  )
}

/**
 * Builds the column set of the online-user table.
 *
 * The fields follow the Vue client's `monitor/online` page: the account, the address the
 * session came from, its browser and OS, and both timestamps the backend records.
 */
export function createOnlineUserColumns({
  rowOffset,
  canKickout,
  isCurrentSession,
  onKickout
}: OnlineUserColumnOptions) {
  const columns: ColumnDef<DataTableFeatures, OnlineUserResp>[] = [
    {
      id: 'index',
      header: '序号',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-center text-sm text-muted-foreground tabular-nums">{rowOffset + row.index + 1}</div>
      )
    },
    {
      id: 'user',
      header: '用户昵称',
      cell: ({ row }) => <UserCell user={row.original} />
    },
    {
      accessorKey: 'ip',
      header: '登录 IP',
      cell: ({ row }) => <TextCell value={row.original.ip} />
    },
    {
      accessorKey: 'address',
      header: '登录地点',
      cell: ({ row }) => <TextCell value={row.original.address} />
    },
    {
      accessorKey: 'browser',
      header: '浏览器',
      cell: ({ row }) => <TextCell value={row.original.browser} />
    },
    {
      accessorKey: 'os',
      header: '终端系统',
      cell: ({ row }) => <TextCell value={row.original.os} />
    },
    {
      accessorKey: 'loginTime',
      header: '登录时间',
      cell: ({ row }) => <TextCell value={row.original.loginTime} />
    },
    {
      accessorKey: 'lastRefreshTime',
      header: '最后刷新时间',
      cell: ({ row }) => <TextCell value={row.original.lastRefreshTime} />
    }
  ]

  if (canKickout) {
    columns.push({
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      cell: ({ row }) => <KickoutCell user={row.original} isCurrentSession={isCurrentSession} onKickout={onKickout} />
    })
  }

  return columns
}
