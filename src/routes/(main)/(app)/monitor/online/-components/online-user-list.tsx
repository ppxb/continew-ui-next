import * as React from 'react'

import type { DateRange } from 'react-day-picker'

import { ProTable } from '@/components/pro'
import { usePermission } from '@/hooks/use-permission'
import { listOnlineUsers, onlineUserKeys, type OnlineUserPageQuery, type OnlineUserResp } from '@/lib/api/online'
import { getSessionId } from '@/lib/auth-session'
import { createRecentDateRange } from '@/lib/date-range'

import { createOnlineUserColumns, type OnlineUserRecord } from './online-user-columns'
import { OnlineUserKickoutDialog } from './online-user-kickout-dialog'

type OnlineUserSearchValues = Omit<OnlineUserPageQuery, 'page' | 'size'> & { dateRange?: DateRange }

export function OnlineUserList() {
  const [initialValues] = React.useState(() => ({ dateRange: createRecentDateRange() }))
  const [kickingUser, setKickingUser] = React.useState<OnlineUserResp | null>(null)
  const { hasPermission } = usePermission()
  const canKickout = hasPermission('monitor:online:kickout')
  const currentSessionId = getSessionId()
  const isCurrentSession = React.useCallback((sessionId: string) => currentSessionId !== null && sessionId === currentSessionId, [currentSessionId])
  const columns = React.useMemo(() => createOnlineUserColumns({ canKickout, isCurrentSession, onKickout: setKickingUser }), [canKickout, isCurrentSession])

  return (
    <>
      <ProTable<OnlineUserRecord, OnlineUserSearchValues>
        headerTitle="在线用户"
        toolbar={{ subTitle: '管理当前系统登录的会话' }}
        rowKey="sessionId"
        columns={columns}
        queryKey={onlineUserKeys.lists()}
        form={{ initialValues }}
        options={{ search: { name: 'nickname', placeholder: '搜索用户名、昵称' } }}
        request={async ({ current, pageSize, dateRange: _dateRange, ...filters }, _sort, _filter, signal) => {
          const page = await listOnlineUsers({ ...filters, page: current, size: pageSize }, signal)
          return { data: page.list, total: page.total }
        }}
      />
      <OnlineUserKickoutDialog user={kickingUser} open={kickingUser !== null} onClose={() => setKickingUser(null)} />
    </>
  )
}
