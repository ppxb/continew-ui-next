import * as React from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'

import { BetaSchemaForm } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { DrawerClose, DrawerFooter } from '@/components/ui/drawer'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { createNotice, getNotice, noticeKeys, updateNotice, type NoticeStatus } from '@/lib/api/notice'

import { noticeColumns, type NoticeRecord } from './notice-columns'
import { NoticeStatusBadge } from './notice-display'
import { toNoticeRequest } from './notice-form-values'
import { useNoticeDetail } from './use-notice-detail'
import { useNoticeDicts } from './use-notice-dicts'

interface NoticeFormDrawerProps {
  readonly noticeId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

export function NoticeFormDrawer({ noticeId, open, onClose }: NoticeFormDrawerProps) {
  const queryClient = useQueryClient()
  const dicts = useNoticeDicts()
  const detailQuery = useNoticeDetail(noticeId, { enabled: open })
  const detail = detailQuery.data
  const isPublished = detail?.status === 3
  const submitStatusRef = React.useRef<NoticeStatus>(3)
  const columns = React.useMemo(() => noticeColumns(dicts), [dicts])

  React.useEffect(() => {
    if (open) submitStatusRef.current = 3
  }, [open, noticeId])

  return (
    <div
      className="contents"
      onSubmitCapture={() => {
        submitStatusRef.current = 3
      }}
    >
      <BetaSchemaForm<NoticeRecord>
        layoutType="DrawerForm"
        title={noticeId === null ? '新增公告' : '修改公告'}
        width={48}
        grid
        drawerProps={{
          icon: <Megaphone className="size-4" />,
          badge:
            noticeId !== null && detail ? (
              <NoticeStatusBadge status={detail.status} options={dicts.statusOptions} />
            ) : undefined
        }}
        open={open}
        onOpenChange={next => {
          if (!next) onClose()
        }}
        columns={columns}
        formItemsRender={items =>
          [
            'title',
            'type',
            'noticeScope',
            'noticeUsers',
            'noticeMethods',
            'isTiming',
            'publishTime',
            'isTop',
            'content'
          ].flatMap(name => items.filter(item => item.name === name).map(item => item.dom))
        }
        initialValues={{ noticeUsers: [], publishTime: null }}
        queryKey={noticeKeys.detail(noticeId)}
        request={noticeId === null ? undefined : (_params, signal) => getNotice(noticeId, signal)}
        submitter={{
          render: props => (
            <DrawerFooter>
              <DrawerClose render={<Button type="button" variant="outline" disabled={props.isSubmitting} />}>
                取消
              </DrawerClose>
              {!isPublished ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={props.isSubmitting}
                  onClick={() => {
                    if (props.form.isSubmitting) return
                    submitStatusRef.current = 1
                    props.submit()
                  }}
                >
                  存草稿
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={props.isSubmitting}
                onClick={() => {
                  if (props.form.isSubmitting) return
                  submitStatusRef.current = 3
                  props.submit()
                }}
              >
                {props.isSubmitting ? (
                  <>
                    <Spinner />
                    {isPublished ? '保存中' : '发布中'}
                  </>
                ) : isPublished ? (
                  '保存'
                ) : (
                  '发布'
                )}
              </Button>
            </DrawerFooter>
          )
        }}
        onFinish={async values => {
          const body = toNoticeRequest(values, submitStatusRef.current)
          if (noticeId === null) await createNotice(body)
          else await updateNotice(noticeId, body)
          void queryClient.invalidateQueries({ queryKey: noticeKeys.all })
          toast.add({ title: noticeId === null ? '新增成功' : '修改成功', type: 'success' })
          return true
        }}
      />
    </div>
  )
}
