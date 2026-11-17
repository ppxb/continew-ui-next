import * as React from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { ProTable } from '@/components/pro'
import { usePermission } from '@/hooks/use-permission'
import { jobKeys, listJobGroups } from '@/lib/api/job'
import { jobLogKeys, listJobLogs, type JobLogResp } from '@/lib/api/job-log'
import { createRecentDateRange } from '@/lib/date-range'

import { JobLogActionDialog, type JobLogActionTarget } from './job-log-action-dialog'
import { createJobLogColumns, type JobLogAction, type JobLogRecord, type JobLogSearchValues } from './job-log-columns'

interface JobLogListProps {
  readonly initialJobId?: string | number
  readonly initialJobName?: string
  readonly initialGroupName?: string
}

export function JobLogList(props: JobLogListProps) {
  const routeKey = JSON.stringify([props.initialJobId, props.initialJobName, props.initialGroupName])
  const [session, setSession] = React.useState(() => ({ routeKey, version: 0, defaults: props }))
  // A new URL target starts on page one; clearing the URL after editing a filter keeps that edit.
  if (session.routeKey !== routeKey) {
    const hasTarget = props.initialJobId !== undefined || props.initialJobName !== undefined || props.initialGroupName !== undefined
    setSession(hasTarget ? { routeKey, version: session.version + 1, defaults: props } : { ...session, routeKey })
  }
  return <JobLogContent key={session.version} {...session.defaults} initialJobId={props.initialJobId} />
}

function JobLogContent({ initialJobId, initialJobName, initialGroupName }: JobLogListProps) {
  const navigate = useNavigate()
  const { hasPermission } = usePermission()
  const canStop = hasPermission('schedule:log:stop')
  const canRetry = hasPermission('schedule:log:retry')
  const canListJobs = hasPermission('schedule:job:list')
  const [releasedJob, setReleasedJob] = React.useState(false)
  const jobId = releasedJob ? undefined : initialJobId
  const [groupName, setGroupName] = React.useState(initialGroupName)
  const [initialValues] = React.useState(() => ({ jobName: initialJobName ?? '', groupName: initialGroupName, dateRange: createRecentDateRange() }))
  const [actionTarget, setActionTarget] = React.useState<JobLogActionTarget | null>(null)
  const groups = useQuery({ queryKey: jobKeys.groups(), queryFn: ({ signal }) => listJobGroups(signal), enabled: canListJobs })
  const groupOptions = React.useMemo(() => {
    const list = groups.data ?? []
    return groupName && !list.includes(groupName) ? [groupName, ...list] : list
  }, [groups.data, groupName])
  const releaseJobFilter = React.useCallback(() => {
    if (jobId === undefined) return
    setReleasedJob(true)
    void navigate({ to: '/schedule/log', search: {}, replace: true })
  }, [jobId, navigate])
  const handleAction = React.useCallback((type: JobLogAction, log: JobLogResp) => setActionTarget({ type, log }), [])
  const columns = React.useMemo(() => createJobLogColumns({ canStop, canRetry, onAction: handleAction,
    groupOptions, onGroupChange: setGroupName, onFilterChange: releaseJobFilter }),
  [canStop, canRetry, handleAction, groupOptions, releaseJobFilter])

  return (
    <>
      <ProTable<JobLogRecord, JobLogSearchValues>
        headerTitle="任务日志"
        toolbar={{ subTitle: '查看任务调度记录、执行状态与执行结果' }}
        rowKey="id"
        columns={columns}
        queryKey={jobLogKeys.lists()}
        params={{ jobId }}
        form={{ initialValues }}
        options={{ search: { name: 'jobName', placeholder: '搜索任务名称', onSearch: releaseJobFilter } }}
        request={async ({ current, pageSize, dateRange: _dateRange, ...filters }, _sort, _filter, signal) => {
          const page = await listJobLogs({ ...filters, page: current, size: pageSize }, signal)
          return { data: page.list, total: page.total }
        }}
      />
      <JobLogActionDialog action={actionTarget} open={actionTarget !== null} onClose={() => setActionTarget(null)} />
    </>
  )
}
