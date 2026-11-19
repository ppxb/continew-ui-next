import * as React from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ListChecks } from 'lucide-react'

import { BetaSchemaForm, type ProFormInstance } from '@/components/pro'
import { toast } from '@/components/ui/toast'
import { createJob, jobKeys, listJobGroups, updateJob, type JobResp } from '@/lib/api/job'

import { jobColumns } from './job-columns'
import { createShardArg, parseShardArgs, toJobRequest, type JobRecord } from './job-form-values'

const FORM_SECTIONS = [
  { title: '基础配置', fields: ['groupName', 'jobName', 'description'] },
  { title: '调度配置', fields: ['triggerType', 'triggerInterval'] },
  { title: '任务配置', fields: ['taskType', 'executorInfo', 'argsStr', 'shardArgs'] },
  {
    title: '高级配置',
    fields: ['routeKey', 'blockStrategy', 'executorTimeout', 'maxRetryTimes', 'retryInterval', 'parallelNum']
  }
]

interface JobFormDrawerProps {
  readonly job: JobResp | null
  readonly open: boolean
  readonly onClose: () => void
  readonly defaultGroupName?: string
}

export function JobFormDrawer({ job, open, onClose, defaultGroupName }: JobFormDrawerProps) {
  const queryClient = useQueryClient()
  const formRef = React.useRef<ProFormInstance>(undefined)
  const groups = useQuery({ queryKey: jobKeys.groups(), queryFn: ({ signal }) => listJobGroups(signal), enabled: open })
  const groupOptions = React.useMemo(() => {
    const values = groups.data ?? []
    return job?.groupName && !values.includes(job.groupName) ? [job.groupName, ...values] : values
  }, [groups.data, job])
  const columns = React.useMemo(
    () => jobColumns({ groupOptions, groupsPending: groups.isPending, groupsError: groups.isError }),
    [groupOptions, groups.isPending, groups.isError]
  )
  const initialValues = React.useMemo(
    () => ({
      groupName: defaultGroupName ?? groupOptions[0] ?? '',
      shardArgs: job ? parseShardArgs(job.argsStr) : [createShardArg()],
      argsStr: job?.argsStr ?? ''
    }),
    [defaultGroupName, groupOptions, job]
  )

  React.useEffect(() => {
    if (open && !job && groups.data?.[0] && !formRef.current?.getFieldValue('groupName')) {
      formRef.current?.setFieldsValue({ groupName: groups.data[0] })
    }
  }, [open, job, groups.data])

  return (
    <BetaSchemaForm<JobRecord>
      layoutType="DrawerForm"
      title={job ? '修改任务' : '新增任务'}
      width={40}
      grid
      drawerProps={{ icon: <ListChecks className="size-4" /> }}
      open={open}
      onOpenChange={next => {
        if (!next) onClose()
      }}
      columns={columns}
      formItemsRender={items => (
        <div className="flex flex-col gap-6 sm:col-span-2">
          {FORM_SECTIONS.map((section, index) => (
            <section
              key={section.title}
              className={index ? 'flex flex-col gap-4 border-t pt-4' : 'flex flex-col gap-4'}
            >
              <h3 className="text-sm font-medium text-foreground">{section.title}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.filter(item => section.fields.includes(item.name)).map(item => item.dom)}
              </div>
            </section>
          ))}
          {items.filter(item => ['jobStatus', 'executorType', 'argsType'].includes(item.name)).map(item => item.dom)}
        </div>
      )}
      formRef={formRef}
      initialValues={initialValues}
      queryKey={[...jobKeys.lists(), 'form', job?.id ?? null]}
      request={job ? async () => job : undefined}
      onFinish={async values => {
        const body = toJobRequest(values)
        if (job) await updateJob(job.id, body)
        else await createJob(body)
        void queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
        toast.add({ title: job ? '修改成功' : '新增成功', type: 'success' })
        return true
      }}
    />
  )
}
