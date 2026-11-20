import * as React from 'react'

import { ProTable, type ProColumns } from '@/components/pro'
import { listUserNotices, messageKeys, type UserNoticePageQuery } from '@/lib/api/message'
import type { NoticeResp } from '@/lib/api/notice'
import { NoticeTypeBadge } from '@/routes/(main)/(app)/system/notice/-components/notice-display'
import type { NoticeDictOption } from '@/routes/(main)/(app)/system/notice/-components/use-notice-dicts'
import { useNoticeDicts } from '@/routes/(main)/(app)/system/notice/-components/use-notice-dicts'
import { NoticeViewDrawer } from '@/routes/(main)/(app)/system/notice/-components/notice-view-drawer'

import { UnreadDot } from './message-display'

type NoticeFilters = Omit<UserNoticePageQuery, 'page' | 'size' | 'sort'>

const DEFAULT_SORT = 'publishTime,desc'

function createNoticeColumns(
  typeOptions: NoticeDictOption[],
  onView: (notice: NoticeResp) => void
): ProColumns<NoticeResp>[] {
  return [
    {
      title: '标题',
      dataIndex: 'title',
      search: true,
      render: (_, notice) => (
        <button
          type="button"
          className="flex max-w-96 min-w-0 items-center gap-2 text-left hover:text-primary"
          onClick={() => onView(notice)}
        >
          <UnreadDot unread={!notice.isRead} />
          <span className={notice.isRead ? 'truncate text-muted-foreground' : 'truncate font-medium'}>
            {notice.title}
          </span>
          {notice.isTop && <span className="shrink-0 text-xs text-primary">置顶</span>}
        </button>
      )
    },
    {
      title: '分类',
      dataIndex: 'type',
      valueType: 'select',
      search: { inline: true },
      valueEnum: new Map(typeOptions.map(item => [item.value, item.label])),
      render: (_, notice) => <NoticeTypeBadge type={notice.type} options={typeOptions} />
    },
    {
      title: '状态',
      dataIndex: 'isRead',
      render: (_, notice) => (
        <span className={notice.isRead ? 'text-muted-foreground' : 'text-destructive'}>
          {notice.isRead ? '已读' : '未读'}
        </span>
      )
    },
    { title: '发布人', dataIndex: 'createUserString' },
    { title: '发布时间', dataIndex: 'publishTime', valueType: 'dateTime' }
  ]
}

export function NoticeList() {
  const { typeOptions } = useNoticeDicts()
  const [viewId, setViewId] = React.useState<string | number | null>(null)
  const columns = React.useMemo(() => createNoticeColumns(typeOptions, notice => setViewId(notice.id)), [typeOptions])

  return (
    <>
      <ProTable<NoticeResp, NoticeFilters>
        tableId="notice"
        rowKey="id"
        columns={columns}
        queryKey={messageKeys.noticeLists()}
        request={async ({ current, pageSize, ...filters }, _sort, _filter, signal) => {
          const page = await listUserNotices({ ...filters, page: current, size: pageSize, sort: DEFAULT_SORT }, signal)
          return { data: page.list, total: page.total }
        }}
      />
      <NoticeViewDrawer noticeId={viewId} open={viewId !== null} onClose={() => setViewId(null)} source="self" />
    </>
  )
}
