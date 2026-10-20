import type { ReactNode } from 'react'

import { cn } from 'cn'
import { ListChecks, X } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
import { StatusCell } from '@/components/status-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import {
  JOB_BLOCK_STRATEGY_LABELS,
  JOB_ROUTE_KEY_LABELS,
  JOB_TASK_TYPE_LABELS,
  JOB_TRIGGER_TYPE_LABELS,
  type JobResp
} from '@/lib/api/job'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

function DetailField({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm wrap-break-word text-foreground">{children}</dd>
    </div>
  )
}

function LabelBadge({ children }: { children: ReactNode }) {
  return <Badge variant="secondary">{children}</Badge>
}

interface JobDetailDrawerProps {
  /** The job to show; the list row is the record, since the API has no detail endpoint. */
  readonly job: JobResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Read-only detail panel for one job, with the field order of the Vue client's drawer. */
export function JobDetailDrawer({ job, open, onClose }: JobDetailDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) {
          onClose()
        }
      }}
      swipeDirection="right"
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:36rem]">
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b p-4 md:gap-2">
          <div className="flex items-center gap-2">
            <ListChecks className="size-4" />
            <DrawerTitle>任务详情</DrawerTitle>
          </div>
          <DrawerClose render={<Button variant="ghost" size="icon-sm" />}>
            <X />
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {job ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailField label="ID" className="sm:col-span-2">
                <CopyableText value={String(job.id)} />
              </DetailField>
              <DetailField label="任务组">{job.groupName || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="任务名称">{job.jobName || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="触发类型">
                <LabelBadge>{JOB_TRIGGER_TYPE_LABELS[job.triggerType] ?? EMPTY_PLACEHOLDER}</LabelBadge>
              </DetailField>
              {job.triggerType === 3 ? (
                <DetailField label="Cron">{job.triggerInterval || EMPTY_PLACEHOLDER}</DetailField>
              ) : job.triggerType === 2 ? (
                <DetailField label="间隔时长">
                  {job.triggerInterval ? `${job.triggerInterval} 秒` : EMPTY_PLACEHOLDER}
                </DetailField>
              ) : (
                <div />
              )}
              <DetailField label="任务类型">
                <LabelBadge>{JOB_TASK_TYPE_LABELS[job.taskType] ?? EMPTY_PLACEHOLDER}</LabelBadge>
              </DetailField>
              <DetailField label="执行器名称">{job.executorInfo || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="任务参数">{job.argsStr || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="路由策略">
                <LabelBadge>{JOB_ROUTE_KEY_LABELS[job.routeKey] ?? EMPTY_PLACEHOLDER}</LabelBadge>
              </DetailField>
              <DetailField label="阻塞策略">
                <LabelBadge>{JOB_BLOCK_STRATEGY_LABELS[job.blockStrategy] ?? EMPTY_PLACEHOLDER}</LabelBadge>
              </DetailField>
              <DetailField label="超时时间">
                {job.executorTimeout === null || job.executorTimeout === undefined
                  ? EMPTY_PLACEHOLDER
                  : `${job.executorTimeout} 秒`}
              </DetailField>
              <DetailField label="最大重试次数">{job.maxRetryTimes ?? EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="重试间隔">
                {job.retryInterval === null || job.retryInterval === undefined
                  ? EMPTY_PLACEHOLDER
                  : `${job.retryInterval} 秒`}
              </DetailField>
              <DetailField label="并行数">{job.parallelNum ?? EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="任务状态">
                <StatusCell status={job.jobStatus === 1 ? 1 : 2} />
              </DetailField>
              <div />
              <DetailField label="描述" className="sm:col-span-2">
                {job.description || EMPTY_PLACEHOLDER}
              </DetailField>
            </dl>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
