import type { ColumnDef } from '@tanstack/react-table'
import { LogOut } from 'lucide-react'

import { dateTimeColumn, indexColumn, textColumn } from '@/components/table/columns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { OnlineUserResp } from '@/lib/api/online'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import type { DataTableFeatures } from '@/lib/data-table-features'

type OnlineUserColumn = ColumnDef<DataTableFeatures, OnlineUserResp>

interface OnlineUserColumnOptions {
  /** The index of the first row on the current page, so 序号 stays continuous. */
  readonly rowOffset: number
  /** The signed-in account may not hold `monitor:online:kickout`; the column is dropped then. */
  readonly canKickout: boolean
  /** The backend rejects kicking out the session that sends the request. */
  readonly isCurrentSession: (sessionId: string) => boolean
  readonly onKickout: (user: OnlineUserResp) => void
}

function UserCell({ user }: { user: OnlineUserResp }) {
  const name = user.nickname || user.username

  return (
    <div className="flex flex-col">
      <span className="truncate">{name || EMPTY_PLACEHOLDER}</span>
      {user.username !== '' && user.username !== name ? <span className="truncate">{user.username}</span> : null}
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
        <Badge variant="secondary">当前会话</Badge>
      ) : (
        <Button variant="destructive" onClick={() => onKickout(user)}>
          <LogOut />
          强退
        </Button>
      )}
    </div>
  )
}

export function createOnlineUserColumns({
  rowOffset,
  canKickout,
  isCurrentSession,
  onKickout
}: OnlineUserColumnOptions) {
  const columns: OnlineUserColumn[] = [
    indexColumn(rowOffset),
    {
      id: 'user',
      header: '用户昵称',
      meta: { valueType: 'text' },
      cell: ({ row }) => <UserCell user={row.original} />
    },
    textColumn('ip', '登录 IP'),
    textColumn('address', '登录地点'),
    textColumn('browser', '浏览器'),
    textColumn('os', '终端系统'),
    dateTimeColumn('loginTime', '登录时间'),
    dateTimeColumn('lastRefreshTime', '最后刷新时间')
  ]

  if (canKickout) {
    columns.push({
      id: 'actions',
      header: () => <div className="text-center">操作</div>,
      enableHiding: false,
      meta: { valueType: 'option' },
      cell: ({ row }) => <KickoutCell user={row.original} isCurrentSession={isCurrentSession} onKickout={onKickout} />
    })
  }

  return columns
}
