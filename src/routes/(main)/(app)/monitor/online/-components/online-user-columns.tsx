import type { DateRange } from 'react-day-picker'
import { LogOut } from 'lucide-react'

import { DateRangeFilter } from '@/components/date-range-filter'
import type { ProColumns } from '@/components/pro'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { OnlineUserResp } from '@/lib/api/online'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'
import { toDateTimeRangeQuery } from '@/lib/date-range'

export type OnlineUserRecord = OnlineUserResp & { dateRange?: DateRange }

interface OnlineUserColumnOptions {
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

export const onlineUserColumns: readonly ProColumns<OnlineUserRecord>[] = [
  { title: '序号', valueType: 'index' },
  { title: '用户昵称', dataIndex: 'nickname', render: (_, user) => <UserCell user={user} /> },
  { title: '登录 IP', dataIndex: 'ip' },
  { title: '登录地点', dataIndex: 'address' },
  { title: '浏览器', dataIndex: 'browser' },
  { title: '终端系统', dataIndex: 'os' },
  { title: '登录时间', dataIndex: 'loginTime', valueType: 'dateTime' },
  { title: '最后刷新时间', dataIndex: 'lastRefreshTime', valueType: 'dateTime' },
  {
    title: '登录时间',
    dataIndex: 'dateRange',
    valueType: 'dateRange',
    hideInTable: true,
    hideInForm: true,
    hideInDescriptions: true,
    search: { transform: value => ({ loginTime: toDateTimeRangeQuery(value as DateRange | undefined) }) },
    formItemRender: (_, control) => (
      <DateRangeFilter
        id={control.id}
        invalid={control.invalid}
        onBlur={control.onBlur}
        value={control.value as DateRange | undefined}
        onChange={control.onChange}
        placeholder="登录时间"
      />
    )
  },
  {
    title: '客户端 ID',
    dataIndex: 'clientId',
    hideInTable: true,
    hideInForm: true,
    hideInDescriptions: true,
    search: true,
    fieldProps: { placeholder: '客户端 ID' }
  }
]

export function createOnlineUserColumns({
  canKickout,
  isCurrentSession,
  onKickout
}: OnlineUserColumnOptions): readonly ProColumns<OnlineUserRecord>[] {
  return canKickout
    ? [
        ...onlineUserColumns,
        {
          title: '操作',
          valueType: 'option',
          fixed: 'right',
          align: 'center',
          render: (_, user) => <KickoutCell user={user} isCurrentSession={isCurrentSession} onKickout={onKickout} />
        }
      ]
    : onlineUserColumns
}
