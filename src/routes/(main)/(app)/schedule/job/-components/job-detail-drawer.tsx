import { ListChecks } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { ProDescriptions } from '@/components/pro'
import { useLastRecord } from '@/hooks/use-last-record'
import type { JobResp } from '@/lib/api/job'

import { jobColumns } from './job-columns'
import type { JobRecord } from './job-form-values'
const DETAIL_COLUMNS = jobColumns()

interface JobDetailDrawerProps {
  readonly job: JobResp | null
  readonly open: boolean
  readonly onClose: () => void
}

export function JobDetailDrawer({ job, open, onClose }: JobDetailDrawerProps) {
  const shownJob = useLastRecord(job)
  return (
    <EntityDrawer open={open} onClose={onClose} title="任务详情" icon={<ListChecks className="size-4" />} width={36}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {shownJob ? <ProDescriptions<JobRecord> columns={DETAIL_COLUMNS} dataSource={shownJob} /> : null}
      </div>
    </EntityDrawer>
  )
}
