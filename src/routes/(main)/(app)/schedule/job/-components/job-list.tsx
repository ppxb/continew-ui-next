import * as React from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { Plus } from 'lucide-react'

import { ProTable, type ProFormInstance } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { usePermission } from '@/hooks/use-permission'
import {
  jobKeys,
  listJobGroups,
  listJobs,
  updateJobStatus,
  type JobQuery,
  type JobResp,
  type JobStatus
} from '@/lib/api/job'

import { createJobColumns, type JobAction } from './job-columns'
import { JobDeleteDialog } from './job-delete-dialog'
import { JobDetailDrawer } from './job-detail-drawer'
import { JobFormDrawer } from './job-form-drawer'
import { JobTriggerDialog } from './job-trigger-dialog'
import type { JobRecord } from './job-form-values'

const HIDDEN_BY_DEFAULT = { updateDt: { show: false } }

export function JobList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = usePermission()
  const canCreate = hasPermission('schedule:job:create')
  const canGet = hasPermission('schedule:job:get')
  const canUpdate = hasPermission('schedule:job:update')
  const canDelete = hasPermission('schedule:job:delete')
  const canTrigger = hasPermission('schedule:job:trigger')
  const canViewLogs = hasPermission('schedule:log:list')
  const formRef = React.useRef<ProFormInstance<Omit<JobQuery, 'page' | 'size'>>>(undefined)
  const [groupName, setGroupName] = React.useState<string | undefined>(undefined)
  const [currentRows, setCurrentRows] = React.useState<JobResp[]>([])
  // The job query waits for the first group so the page does not briefly list every group.
  const [groupReady, setGroupReady] = React.useState(false)
  // A late group lookup must not override a group the user has already picked.
  const groupTouchedRef = React.useRef(false)
  // One state per overlay: a null value means it is closed. The form drawer holds an object,
  // because a null job there means 新增.
  const [detailJob, setDetailJob] = React.useState<JobResp | null>(null)
  const [formTarget, setFormTarget] = React.useState<{ job: JobResp | null } | null>(null)
  const [triggerJob, setTriggerJob] = React.useState<JobResp | null>(null)
  const [deletingJob, setDeletingJob] = React.useState<JobResp | null>(null)

  const groups = useQuery({
    queryKey: jobKeys.groups(),
    queryFn: ({ signal }) => listJobGroups(signal)
  })

  React.useEffect(() => {
    if (groups.isSuccess) {
      if (!groupTouchedRef.current) {
        const firstGroup = groups.data[0]
        setGroupName(current => current ?? firstGroup)
        if (!formRef.current?.getFieldValue('groupName')) formRef.current?.setFieldsValue({ groupName: firstGroup })
      }
      setGroupReady(true)
      return
    }

    if (groups.isError) {
      // Let the list load without a group rather than wait forever on a failed lookup.
      setGroupReady(true)
    }
  }, [groups.isSuccess, groups.isError, groups.data])


  const handleToggleStatus = React.useCallback(
    async (job: JobResp, next: JobStatus) => {
      await updateJobStatus(job.id, { jobStatus: next })
      toast.add({ title: next === 1 ? '启用成功' : '禁用成功', type: 'success' })
      void queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
    },
    [queryClient]
  )

  const handleAction = React.useCallback(
    (action: JobAction, job: JobResp) => {
      if (action === 'detail') {
        setDetailJob(job)
        return
      }

      if (action === 'trigger') {
        setTriggerJob(job)
        return
      }

      if (action === 'edit') {
        setFormTarget({ job })
        return
      }

      if (action === 'logs') {
        void navigate({
          to: '/schedule/log',
          search: { jobId: String(job.id), jobName: job.jobName, groupName: job.groupName }
        })
        return
      }

      setDeletingJob(job)
    },
    [navigate]
  )

  const columns = React.useMemo(() => createJobColumns({
    canGet, canTrigger, canUpdate, canViewLogs, canDelete,
    groupOptions: groups.data,
    onGroupChange: () => { groupTouchedRef.current = true },
    onAction: handleAction, onToggleStatus: handleToggleStatus
  }), [canGet, canTrigger, canUpdate, canViewLogs, canDelete, groups.data, handleAction, handleToggleStatus])

  // The API has no detail endpoint, so keep the drawer on the freshest copy of the row the
  // list currently holds and fall back to the clicked snapshot once it leaves the page.
  const liveDetailJob = React.useMemo(() => {
    if (!detailJob) {
      return null
    }

    return currentRows.find(job => String(job.id) === String(detailJob.id)) ?? detailJob
  }, [detailJob, currentRows])


  return (
    <>
      <ProTable<JobRecord, Omit<JobQuery, 'page' | 'size'>>
        headerTitle="任务管理"
        toolbar={{ subTitle: '管理定时任务、调度策略与执行状态' }}
        rowKey="id"
        queryKey={jobKeys.lists()}
        columns={columns}
        columnsState={{ defaultValue: HIDDEN_BY_DEFAULT }}
        formRef={formRef}
        manualRequest={!groupReady}
        loading={!groupReady ? true : undefined}
        options={{ search: { name: 'jobName', placeholder: '搜索任务名称' } }}
        request={async ({ current, pageSize, groupName: selectedGroup, jobName, jobStatus }, _sort, _filter, signal) => {
          const result = await listJobs({ page: current, size: pageSize, groupName: selectedGroup, jobName: jobName || undefined, jobStatus }, signal)
          if (!signal.aborted) {
            setCurrentRows(result.list)
            setGroupName(selectedGroup)
          }
          return { data: result.list, total: result.total, success: true }
        }}
        toolBarRender={() => canCreate ? [<Button key="create" className="w-full sm:w-auto" onClick={() => setFormTarget({ job: null })}><Plus />新增任务</Button>] : []}
      />

      <JobDetailDrawer job={liveDetailJob} open={detailJob !== null} onClose={() => setDetailJob(null)} />
      <JobFormDrawer
        job={formTarget?.job ?? null}
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
        defaultGroupName={groupName}
      />
      <JobTriggerDialog job={triggerJob} open={triggerJob !== null} onClose={() => setTriggerJob(null)} />
      <JobDeleteDialog job={deletingJob} open={deletingJob !== null} onClose={() => setDeletingJob(null)} />
    </>
  )
}
