import * as React from 'react'

import { Plus, RefreshCw } from 'lucide-react'

import { ProTable, type ProFormInstance } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { usePermission } from '@/hooks/use-permission'
import { listNotices, noticeKeys, type NoticePageQuery, type NoticeResp } from '@/lib/api/notice'

import { createNoticeColumns, HIDDEN_BY_DEFAULT, type NoticeAction, type NoticeRecord } from './notice-columns'
import { NoticeDeleteDialog } from './notice-delete-dialog'
import { NoticeDetailDrawer } from './notice-detail-drawer'
import { NoticeFormDrawer } from './notice-form-drawer'
import { NoticeViewDrawer } from './notice-view-drawer'
import { useNoticeDicts } from './use-notice-dicts'

const DEFAULT_SORT = 'id,desc'

export function NoticeList() {
  const { hasPermission } = usePermission()
  const dicts = useNoticeDicts()

  const formRef = React.useRef<ProFormInstance<Omit<NoticePageQuery, 'page' | 'size'>>>(undefined)

  // One state per overlay: a null value means it is closed, so "which record" and "is it open" can
  // never drift apart. The form drawer holds an object, because a null id there means 新增.
  const [detailId, setDetailId] = React.useState<string | number | null>(null)
  const [viewId, setViewId] = React.useState<string | number | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ noticeId: string | number | null } | null>(null)
  const [deletingNotice, setDeletingNotice] = React.useState<NoticeResp | null>(null)

  const handleRowAction = React.useCallback((action: NoticeAction, notice: NoticeResp) => {
    if (action === 'detail') {
      setDetailId(notice.id)
      return
    }

    if (action === 'view') {
      setViewId(notice.id)
      return
    }

    if (action === 'edit') {
      setFormTarget({ noticeId: notice.id })
      return
    }

    setDeletingNotice(notice)
  }, [])

  const columns = React.useMemo(() => createNoticeColumns(dicts, handleRowAction), [dicts, handleRowAction])

  return (
    <>
      <ProTable<NoticeRecord, Omit<NoticePageQuery, 'page' | 'size'>>
        headerTitle="通知公告"
        toolbar={{ subTitle: '管理系统内部的通知与公告' }}
        rowKey="id"
        queryKey={noticeKeys.lists()}
        columns={columns}
        columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
        formRef={formRef}
        options={{ search: { name: 'title', placeholder: '搜索公告标题' } }}
        request={async ({ current, pageSize, title, type }, _sort, _filter, signal) => {
          const result = await listNotices(
            { page: current, size: pageSize, title: title || undefined, type, sort: DEFAULT_SORT },
            signal
          )
          return { data: result.list, total: result.total, success: true }
        }}
        toolBarRender={action => {
          const filters = formRef.current?.getFieldsFormatValue()
          return [
            ...(filters?.title || filters?.type
              ? [
                  <Button key="reset" type="button" variant="ghost" onClick={() => action?.reset()}>
                    <RefreshCw />
                    重置
                  </Button>
                ]
              : []),
            ...(hasPermission('system:notice:create')
              ? [
                  <Button key="create" className="w-full sm:w-auto" onClick={() => setFormTarget({ noticeId: null })}>
                    <Plus />
                    新增公告
                  </Button>
                ]
              : [])
          ]
        }}
      />

      <NoticeDetailDrawer noticeId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} />
      <NoticeViewDrawer noticeId={viewId} open={viewId !== null} onClose={() => setViewId(null)} />
      <NoticeFormDrawer
        noticeId={formTarget?.noticeId ?? null}
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
      />
      <NoticeDeleteDialog
        notice={deletingNotice}
        open={deletingNotice !== null}
        onClose={() => setDeletingNotice(null)}
      />
    </>
  )
}
