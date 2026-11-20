import * as React from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { CheckCheck, Eye, MailCheck, Trash2 } from 'lucide-react'

import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { FilterSelect } from '@/components/filter-select'
import { ProTable, type ProColumns, type ProSchemaValueEnumType } from '@/components/pro'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/toast'
import { reportError } from '@/lib/http'
import {
  deleteMessages,
  listMessages,
  messageKeys,
  type MessagePageQuery,
  type MessageResp,
  type MessageType,
  readAllMessages,
  readMessages
} from '@/lib/api/message'

import { MESSAGE_TYPE_LABELS, MessageTypeBadge, UnreadDot } from './message-display'
import { MessageDetailDrawer } from './message-detail-drawer'
import { useUnreadCounts } from './use-messages'

type MessageFilters = Omit<MessagePageQuery, 'page' | 'size' | 'sort'>

const DEFAULT_SORT = 'createTime,desc'

const TYPE_ENUM = new Map<MessageType, ProSchemaValueEnumType>([
  [1, { text: MESSAGE_TYPE_LABELS[1] }],
  [2, { text: MESSAGE_TYPE_LABELS[2] }]
])
const TYPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '1', label: MESSAGE_TYPE_LABELS[1] },
  { value: '2', label: MESSAGE_TYPE_LABELS[2] }
]
const READ_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'unread', label: '未读' },
  { value: 'read', label: '已读' }
]

interface MessageColumnOptions {
  readonly selected: ReadonlySet<string>
  readonly pageIds: React.RefObject<string[]>
  readonly onSelect: (ids: string[], checked: boolean) => void
  readonly onView: (message: MessageResp) => void
  readonly onRead: (message: MessageResp) => void
  readonly onDelete: (message: MessageResp) => void
}

function SelectAll({ selected, pageIds, onSelect }: Pick<MessageColumnOptions, 'selected' | 'pageIds' | 'onSelect'>) {
  const ids = pageIds.current
  const count = ids.filter(id => selected.has(id)).length

  return (
    <div className="flex items-center justify-center">
      <Checkbox
        checked={ids.length > 0 && count === ids.length}
        indeterminate={count > 0 && count < ids.length}
        // Read the ids on click: this header can render before the first page has arrived.
        onCheckedChange={checked => onSelect(pageIds.current, Boolean(checked))}
      />
    </div>
  )
}

function createMessageColumns({
  selected,
  pageIds,
  onSelect,
  onView,
  onRead,
  onDelete
}: MessageColumnOptions): ProColumns<MessageResp>[] {
  return [
    {
      key: 'select',
      title: <SelectAll selected={selected} pageIds={pageIds} onSelect={onSelect} />,
      valueType: 'option',
      align: 'center',
      hideInSetting: true,
      render: (_, message) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={selected.has(String(message.id))}
            onCheckedChange={checked => onSelect([String(message.id)], Boolean(checked))}
          />
        </div>
      )
    },
    {
      title: '标题',
      dataIndex: 'title',
      search: true,
      render: (_, message) => (
        <button
          type="button"
          className="flex max-w-96 min-w-0 items-center gap-2 text-left hover:text-primary"
          onClick={() => onView(message)}
        >
          <UnreadDot unread={!message.isRead} />
          <span className={message.isRead ? 'truncate text-muted-foreground' : 'truncate font-medium'}>
            {message.title}
          </span>
        </button>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      valueType: 'select',
      valueEnum: TYPE_ENUM,
      search: { inline: true },
      formItemRender: (_, control) => (
        <FilterSelect
          label="类型"
          options={TYPE_OPTIONS}
          className="w-full sm:w-36"
          value={control.value === undefined ? 'all' : String(control.value)}
          onValueChange={value => control.onChange(value === '1' ? 1 : value === '2' ? 2 : undefined)}
        />
      ),
      render: (_, message) => <MessageTypeBadge type={message.type} />
    },
    {
      title: '状态',
      dataIndex: 'isRead',
      search: { inline: true },
      formItemRender: (_, control) => (
        <FilterSelect
          label="状态"
          options={READ_OPTIONS}
          className="w-full sm:w-32"
          value={control.value === true ? 'read' : control.value === false ? 'unread' : 'all'}
          onValueChange={value => control.onChange(value === 'read' ? true : value === 'unread' ? false : undefined)}
        />
      ),
      render: (_, message) => (
        <span className={message.isRead ? 'text-muted-foreground' : 'text-destructive'}>
          {message.isRead ? '已读' : '未读'}
        </span>
      )
    },
    { title: '时间', dataIndex: 'createTime', valueType: 'dateTime' },
    {
      title: '操作',
      valueType: 'option',
      align: 'center',
      render: (_, message) => (
        <div className="flex items-center justify-center">
          <RowActionsMenu>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onView(message)}>
                <Eye />
                查看
              </DropdownMenuItem>
              <DropdownMenuItem disabled={message.isRead} onClick={() => onRead(message)}>
                <MailCheck />
                标记已读
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(message)}>
              <Trash2 />
              删除
            </DropdownMenuItem>
          </RowActionsMenu>
        </div>
      )
    }
  ]
}

export function MessageList() {
  const queryClient = useQueryClient()
  const { messageCount } = useUnreadCounts()
  const pageIds = React.useRef<string[]>([])
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(() => new Set())
  const [viewId, setViewId] = React.useState<string | number | null>(null)
  const [deleteIds, setDeleteIds] = React.useState<string[] | null>(null)
  const [isReading, setIsReading] = React.useState(false)

  const refresh = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: messageKeys.unread() })
    void queryClient.invalidateQueries({ queryKey: messageKeys.lists() })
  }, [queryClient])

  const markRead = React.useCallback(
    async (ids: string[] | null) => {
      setIsReading(true)
      try {
        await (ids ? readMessages(ids) : readAllMessages())
        toast.add({ title: ids ? '已标记为已读' : '全部消息已读', type: 'success' })
        setSelected(new Set())
        refresh()
      } catch (error) {
        reportError(error)
      } finally {
        setIsReading(false)
      }
    },
    [refresh, setIsReading, setSelected]
  )

  const onSelect = React.useCallback(
    (ids: string[], checked: boolean) => {
      setSelected(previous => {
        const next = new Set(previous)
        for (const id of ids) {
          if (checked) next.add(id)
          else next.delete(id)
        }
        return next
      })
    },
    [setSelected]
  )

  const columns = React.useMemo(
    () =>
      createMessageColumns({
        selected,
        pageIds,
        onSelect,
        onView: message => setViewId(message.id),
        onRead: message => void markRead([String(message.id)]),
        onDelete: message => setDeleteIds([String(message.id)])
      }),
    [selected, onSelect, markRead, setViewId, setDeleteIds]
  )

  return (
    <>
      <ProTable<MessageResp, MessageFilters>
        tableId="message"
        rowKey="id"
        columns={columns}
        queryKey={messageKeys.lists()}
        postData={rows => {
          pageIds.current = rows.map(row => String(row.id))
          return rows
        }}
        request={async ({ current, pageSize, ...filters }, _sort, _filter, signal) => {
          const page = await listMessages({ ...filters, page: current, size: pageSize, sort: DEFAULT_SORT }, signal)
          return { data: page.list, total: page.total }
        }}
        toolBarRender={() => {
          // Read here, after `postData` ran: only rows on the current page count, so a selection
          // made on another page never acts unseen.
          const ids = pageIds.current.filter(id => selected.has(id))
          const suffix = ids.length > 0 ? ` (${ids.length})` : ''
          return [
            <Button
              key="read"
              variant="outline"
              disabled={ids.length === 0 || isReading}
              onClick={() => void markRead(ids)}
            >
              <MailCheck />
              标记已读{suffix}
            </Button>,
            <Button key="delete" variant="outline" disabled={ids.length === 0} onClick={() => setDeleteIds(ids)}>
              <Trash2 />
              删除{suffix}
            </Button>,
            <Button key="read-all" disabled={messageCount === 0 || isReading} onClick={() => void markRead(null)}>
              <CheckCheck />
              全部已读
            </Button>
          ]
        }}
      />

      <MessageDetailDrawer messageId={viewId} open={viewId !== null} onClose={() => setViewId(null)} />
      <DeleteConfirmDialog
        open={deleteIds !== null}
        onClose={() => setDeleteIds(null)}
        title="删除消息"
        description={
          deleteIds && deleteIds.length > 1 ? `确定删除选中的 ${deleteIds.length} 条消息吗？` : '确定删除这条消息吗？'
        }
        action={async () => {
          await deleteMessages(deleteIds ?? [])
          setSelected(new Set())
        }}
        invalidateKeys={[messageKeys.unread(), messageKeys.lists()]}
      />
    </>
  )
}
