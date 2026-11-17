import { z } from 'zod'
import { Eye, Layers, Pen, Play, Plus, ScrollText, Trash2 } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
import { FormItem } from '@/components/form'
import { type ProColumns } from '@/components/pro'
import { RowActionsMenu } from '@/components/row-actions-menu'
import { StatusCell } from '@/components/status-cell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { JOB_BLOCK_STRATEGY_OPTIONS, JOB_ROUTE_KEY_OPTIONS, JOB_TASK_TYPE_OPTIONS, JOB_TRIGGER_TYPE_OPTIONS, type JobResp, type JobStatus } from '@/lib/api/job'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { JobStatusSwitch, TaskTypeCell, TriggerTypeCell } from './job-display'
import { createShardArg, jobFormRules, parseShardArgs, type JobRecord, type ShardArg } from './job-form-values'

/** The row actions the table raises. */
export type JobAction = 'detail' | 'trigger' | 'edit' | 'logs' | 'delete'

interface JobColumnOptions {
  readonly groupOptions?: readonly string[]
  readonly groupsPending?: boolean
  readonly groupsError?: boolean
  readonly onGroupChange?: () => void
  readonly canGet: boolean
  readonly canTrigger: boolean
  readonly canUpdate: boolean
  readonly canViewLogs: boolean
  readonly canDelete: boolean
  readonly onAction: (action: JobAction, job: JobResp) => void
  readonly onToggleStatus: (job: JobResp, next: JobStatus) => Promise<void>
}

function RowActions({
  job,
  canGet,
  canTrigger,
  canUpdate,
  canViewLogs,
  canDelete,
  onAction
}: {
  job: JobResp
  canGet: boolean
  canTrigger: boolean
  canUpdate: boolean
  canViewLogs: boolean
  canDelete: boolean
  onAction: (action: JobAction, job: JobResp) => void
}) {
  const hasPrimary = canGet || canTrigger || canUpdate || canViewLogs

  return (
    <div className="flex items-center justify-center">
      <RowActionsMenu>
        {hasPrimary ? (
          <DropdownMenuGroup>
            {canGet ? (
              <DropdownMenuItem onClick={() => onAction('detail', job)}>
                <Eye />
                详情
              </DropdownMenuItem>
            ) : null}
            {canTrigger ? (
              <DropdownMenuItem onClick={() => onAction('trigger', job)}>
                <Play />
                执行
              </DropdownMenuItem>
            ) : null}
            {canUpdate ? (
              <DropdownMenuItem onClick={() => onAction('edit', job)}>
                <Pen />
                修改
              </DropdownMenuItem>
            ) : null}
            {canViewLogs ? (
              <DropdownMenuItem onClick={() => onAction('logs', job)}>
                <ScrollText />
                查看日志
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        ) : null}
        {hasPrimary && canDelete ? <DropdownMenuSeparator /> : null}
        {canDelete ? (
          <DropdownMenuItem variant="destructive" onClick={() => onAction('delete', job)}>
            <Trash2 />
            删除
          </DropdownMenuItem>
        ) : null}
      </RowActionsMenu>
    </div>
  )
}

const CRON_PRESETS = [
  { label: '每分钟', value: '0 * * * * ?' },
  { label: '每30分钟', value: '0 0/30 * * * ?' },
  { label: '每小时', value: '0 0 * * * ?' },
  { label: '每天零点', value: '0 0 0 * * ?' },
  { label: '每月1日零点', value: '0 0 0 1 * ?' },
  { label: '每月最后一天零点', value: '0 0 0 L * ?' },
  { label: '每月最后一个工作日零点', value: '0 0 0 LW * ?' },
  { label: '每周日零点', value: '0 0 0 ? * 1' }
]

export function jobColumns(options: Partial<JobColumnOptions> = {}): ProColumns<JobRecord>[] {
  const groupItems = (options.groupOptions ?? []).map(group => ({ value: group, label: group }))
  return [
    { title: '序号', valueType: 'index' },
    { title: 'ID', dataIndex: 'id', hideInTable: true, hideInForm: true, span: 2, render: (_, job) => <CopyableText value={String(job.id)} /> },
    {
      title: '任务组', dataIndex: 'groupName', valueType: 'select', hideInTable: true, search: true,
      valueEnum: new Map(groupItems.map(item => [item.value, item.label])), initialValue: '',
      fieldProps: { placeholder: '请选择任务组', onChange: options.onGroupChange },
      formItemProps: { rules: jobFormRules.groupName },
      ignoreFormItem: true,
      formItemRender: (schema, control) => schema.type === 'table' ? control.defaultRender() : <FormItem id={control.id} label="任务组" required errors={groupItems.length && control.invalid ? [{ message: '请选择任务组' }] : []}>
        {options.groupsPending && !groupItems.length ? <Skeleton className="h-8 w-full" /> :
          <Select items={groupItems} value={String(control.value ?? '')} disabled={control.disabled} onValueChange={value => control.onChange(value ?? '')}>
            <SelectTrigger id={control.id} className="w-full" aria-invalid={control.invalid} onBlur={control.onBlur}><SelectValue placeholder="请选择任务组" /></SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {groupItems.length ? <SelectGroup>{groupItems.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup> :
                <Empty className="p-3"><EmptyHeader><EmptyMedia variant="icon"><Layers /></EmptyMedia><EmptyTitle>{options.groupsError ? '任务组加载失败' : '暂无可用任务组'}</EmptyTitle><EmptyDescription>{options.groupsError ? '请关闭抽屉后重新打开重试' : '请确认调度执行器已注册任务组后再试'}</EmptyDescription></EmptyHeader></Empty>}
            </SelectContent>
          </Select>}
      </FormItem>
    },
    { title: '任务名称', dataIndex: 'jobName', fieldProps: { maxLength: 64, placeholder: '请输入任务名称' }, formItemProps: { rules: jobFormRules.jobName } },
    {
      title: (_, type) => type === 'table' ? '调度类型' : '触发类型', dataIndex: 'triggerType', valueType: 'select',
      valueEnum: new Map(JOB_TRIGGER_TYPE_OPTIONS.map(item => [item.value, item.label])), initialValue: '2', convertValue: value => String(value),
      formItemProps: { rules: jobFormRules.triggerType },
      fieldProps: form => ({ onChange: value => form?.setFieldsValue({ triggerInterval: value === '3' ? '0 * * * * ?' : '60' }) }),
      render: (_, job, _index, _action, schema) => schema.type === 'table' ? <TriggerTypeCell job={job} /> : <Badge variant="secondary">{JOB_TRIGGER_TYPE_OPTIONS.find(item => item.value === String(job.triggerType))?.label ?? EMPTY_PLACEHOLDER}</Badge>
    },
    {
      valueType: 'dependency', name: ['triggerType'], columns: values => [{
        title: (_, type) => String(values.triggerType) === '2' ? '间隔时长' : type === 'descriptions' ? 'Cron' : 'Cron 表达式', dataIndex: 'triggerInterval', hideInTable: true, initialValue: '60',
        formItemProps: { rules: String(values.triggerType) === '2' ? z.string().refine(value => /^\d+$/.test(value) && Number(value) >= 1, '间隔时长必须是不小于 1 的整数').transform(value => value.trim()) : z.string().trim().min(1, '请输入 Cron 表达式') },
        render: (_, job) => job.triggerType === 2 ? job.triggerInterval ? `${job.triggerInterval} 秒` : EMPTY_PLACEHOLDER : job.triggerInterval || EMPTY_PLACEHOLDER,
        formItemRender: (_, control) => String(values.triggerType) === '2' ?
          <InputGroup><InputGroupInput id={control.id} type="number" min={1} disabled={control.disabled} value={String(control.value ?? '')} onChange={event => control.onChange(event.target.value)} onBlur={control.onBlur} placeholder="请输入间隔时长" aria-invalid={control.invalid} /><InputGroupAddon align="inline-end">秒</InputGroupAddon></InputGroup> :
          <div className="flex gap-2"><Input id={control.id} disabled={control.disabled} value={String(control.value ?? '')} onChange={event => control.onChange(event.target.value)} onBlur={control.onBlur} placeholder="0 * * * * ?" aria-invalid={control.invalid} /><DropdownMenu><DropdownMenuTrigger render={<Button type="button" disabled={control.disabled} variant="outline" className="shrink-0" />}>常用表达式</DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52">{CRON_PRESETS.map(preset => <DropdownMenuItem key={preset.value} disabled={control.disabled} onClick={() => control.onChange(preset.value)}><span className="flex flex-col"><span>{preset.label}</span><span className="text-xs text-muted-foreground">{preset.value}</span></span></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>
      }]
    },
    {
      title: '任务类型', dataIndex: 'taskType', valueType: 'select', initialValue: '1', convertValue: value => String(value),
      valueEnum: new Map(JOB_TASK_TYPE_OPTIONS.map(item => [item.value, item.label])), formItemProps: { rules: jobFormRules.taskType },
      render: (_, job, _index, _action, schema) => schema.type === 'table' ? <TaskTypeCell job={job} /> : <Badge variant="secondary">{JOB_TASK_TYPE_OPTIONS.find(item => item.value === String(job.taskType))?.label ?? EMPTY_PLACEHOLDER}</Badge>
    },
    { title: '执行器名称', dataIndex: 'executorInfo', hideInTable: true, fieldProps: { maxLength: 255, placeholder: '请输入执行器名称' }, formItemProps: { rules: jobFormRules.executorInfo } },
    {
      valueType: 'dependency', name: ['taskType'], columns: values => String(values.taskType) === '3' ? [{
        title: '任务参数', dataIndex: 'shardArgs', hideInTable: true, initialValue: [createShardArg()], convertValue: (_, _field, job) => parseShardArgs(job.argsStr), render: (_, job) => job.argsStr || EMPTY_PLACEHOLDER,
        formItemProps: { rules: jobFormRules.shardArgs, required: false }, ignoreFormItem: true,
        formItemRender: (_, control) => {
          const args = (control.value ?? []) as ShardArg[]
          return <FormItem
            id={control.id}
            label="任务参数"
            className="sm:col-span-2"
            description={control.invalid ? undefined : '静态切片任务会把每个参数分给一个执行器'}
            errors={control.invalid ? [{ message: '请填写完整的分片参数' }] : []}
          >
            <div className="flex flex-col gap-2">
              {args.map((arg, index) => <div key={arg.id} className="flex items-center gap-2">
                <Input
                  id={index === 0 ? control.id : `${control.id}-${arg.id}`}
                  value={arg.value}
                  disabled={control.disabled}
                  onChange={event => control.onChange(args.map(item => item.id === arg.id ? { ...item, value: event.target.value } : item))}
                  onBlur={control.onBlur}
                  placeholder={`请输入分片参数 ${index + 1}`}
                  aria-invalid={control.invalid}
                />
                <Tooltip>
                  <TooltipTrigger render={<Button type="button" disabled={control.disabled} variant="outline" size="icon-sm" onClick={() => control.onChange(args.filter(item => item.id !== arg.id))} />}><Trash2 /></TooltipTrigger>
                  <TooltipContent side="top">删除该参数</TooltipContent>
                </Tooltip>
              </div>)}
              <Button id={!args.length ? control.id : undefined} disabled={control.disabled} aria-invalid={!args.length && control.invalid} type="button" size="sm" variant="outline" onClick={() => control.onChange([...args, createShardArg()])}>
                <Plus />添加分片参数
              </Button>
            </div>
          </FormItem>
        }
      }] : [{ title: '任务参数', dataIndex: 'argsStr', valueType: 'textarea', hideInTable: true, initialValue: '', fieldProps: { rows: 3, placeholder: '请输入任务参数' }, formItemProps: { rules: jobFormRules.argsStr, className: 'sm:col-span-2' } }]
    },
    { title: '路由策略', dataIndex: 'routeKey', valueType: 'select', hideInTable: true, initialValue: '4', convertValue: value => String(value), valueEnum: new Map(JOB_ROUTE_KEY_OPTIONS.map(item => [item.value, item.label])), formItemProps: { rules: jobFormRules.routeKey }, render: (_, job) => <Badge variant="secondary">{JOB_ROUTE_KEY_OPTIONS.find(item => item.value === String(job.routeKey))?.label ?? EMPTY_PLACEHOLDER}</Badge> },
    { title: '阻塞策略', dataIndex: 'blockStrategy', valueType: 'select', hideInTable: true, initialValue: '1', convertValue: value => String(value), valueEnum: new Map(JOB_BLOCK_STRATEGY_OPTIONS.map(item => [item.value, item.label])), formItemProps: { rules: jobFormRules.blockStrategy }, render: (_, job) => <Badge variant="secondary">{JOB_BLOCK_STRATEGY_OPTIONS.find(item => item.value === String(job.blockStrategy))?.label ?? EMPTY_PLACEHOLDER}</Badge> },
    { title: '超时时间', dataIndex: 'executorTimeout', valueType: 'digit', hideInTable: true, initialValue: 60, fieldProps: { min: 1, placeholder: '请输入超时时间', addonEnd: '秒' }, formItemProps: { rules: jobFormRules.executorTimeout }, render: (_, job) => job.executorTimeout == null ? EMPTY_PLACEHOLDER : `${job.executorTimeout} 秒` },
    { title: '最大重试次数', dataIndex: 'maxRetryTimes', valueType: 'digit', hideInTable: true, initialValue: 3, fieldProps: { min: 0, placeholder: '请输入最大重试次数' }, formItemProps: { rules: jobFormRules.maxRetryTimes } },
    { title: '重试间隔', dataIndex: 'retryInterval', valueType: 'digit', hideInTable: true, initialValue: 1, fieldProps: { min: 1, placeholder: '请输入重试间隔', addonEnd: '秒' }, formItemProps: { rules: jobFormRules.retryInterval }, render: (_, job) => job.retryInterval == null ? EMPTY_PLACEHOLDER : `${job.retryInterval} 秒` },
    { title: '并行数', dataIndex: 'parallelNum', valueType: 'digit', hideInTable: true, initialValue: 1, fieldProps: { min: 1, placeholder: '请输入并行数' }, formItemProps: { rules: jobFormRules.parallelNum } },
    {
      title: (_, type) => type === 'table' ? '状态' : '任务状态', dataIndex: 'jobStatus', valueType: 'select', search: true, initialValue: 0,
      valueEnum: new Map([[1, '启用'], [0, '禁用']]), formItemProps: { rules: jobFormRules.jobStatus }, ignoreFormItem: true, formItemRender: (schema, control) => schema.type === 'table' ? control.defaultRender() : null,
      render: (_, job, _index, _action, schema) => schema.type === 'table' && options.onToggleStatus ? <div className="flex justify-center"><JobStatusSwitch job={job} canUpdate={Boolean(options.canUpdate)} onToggle={options.onToggleStatus} /></div> : <StatusCell status={job.jobStatus === 1 ? 1 : 2} />
    },
    { title: '描述', dataIndex: 'description', valueType: 'textarea', ellipsis: true, span: 2, initialValue: '', fieldProps: { maxLength: 200, rows: 3, placeholder: '请输入描述' }, formItemProps: { rules: jobFormRules.description, className: 'sm:col-span-2' } },
    { title: '创建时间', dataIndex: 'createDt', valueType: 'dateTime', hideInForm: true, hideInDescriptions: true },
    { title: '修改时间', dataIndex: 'updateDt', valueType: 'dateTime', hideInForm: true, hideInDescriptions: true },
    { dataIndex: 'executorType', initialValue: 1, hideInTable: true, hideInDescriptions: true, ignoreFormItem: true, formItemRender: () => null, convertValue: value => value ?? null, formItemProps: { rules: jobFormRules.executorType } },
    { dataIndex: 'argsType', initialValue: null, hideInTable: true, hideInDescriptions: true, ignoreFormItem: true, formItemRender: () => null, convertValue: value => value === null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value), formItemProps: { rules: jobFormRules.argsType } }
  ]
}

export function createJobColumns(options: JobColumnOptions): ProColumns<JobRecord>[] {
  const columns = jobColumns(options)
  if (options.canGet || options.canTrigger || options.canUpdate || options.canViewLogs || options.canDelete) {
    columns.push({ title: '操作', valueType: 'option', render: (_, job) => <RowActions job={job} canGet={options.canGet} canTrigger={options.canTrigger} canUpdate={options.canUpdate} canViewLogs={options.canViewLogs} canDelete={options.canDelete} onAction={options.onAction} /> })
  }
  return columns
}
