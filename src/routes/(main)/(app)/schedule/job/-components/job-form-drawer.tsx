import * as React from 'react'

import { revalidateLogic } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { Layers, ListChecks, Plus, Trash2 } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { FormItem, useAppForm } from '@/components/form'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useFillFormOnce } from '@/hooks/use-fill-form-once'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  createJob,
  JOB_BLOCK_STRATEGY_OPTIONS,
  JOB_ROUTE_KEY_OPTIONS,
  JOB_TASK_TYPE_OPTIONS,
  JOB_TRIGGER_TYPE_OPTIONS,
  jobKeys,
  listJobGroups,
  updateJob,
  type JobBlockStrategy,
  type JobReq,
  type JobResp,
  type JobRouteKey,
  type JobTaskType,
  type JobTriggerType
} from '@/lib/api/job'

/** The built-in expressions the Vue client offers in its cron picker. */
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

/** `null` is a cleared input; the refine reports it instead of snapping the value back. */
const positiveInteger = (message: string, min: number, emptyMessage: string) =>
  z
    .number()
    .int(message)
    .min(min, message)
    .nullable()
    .refine(value => value !== null, emptyMessage)

const formSchema = z.object({
  groupName: z.string().min(1, '请选择任务组'),
  jobName: z.string().trim().min(1, '请输入任务名称').max(64, '任务名称不能超过 64 个字符'),
  description: z.string().max(200, '描述不能超过 200 个字符'),
  triggerType: z.union([z.literal('2'), z.literal('3')]),
  triggerInterval: z.string().trim().min(1, '请输入间隔时长或 Cron 表达式'),
  taskType: z.union([z.literal('1'), z.literal('2'), z.literal('3')]),
  executorInfo: z.string().trim().min(1, '请输入执行器名称').max(255, '执行器名称不能超过 255 个字符'),
  argsStr: z.string(),
  routeKey: z.union([z.literal('1'), z.literal('2'), z.literal('3'), z.literal('4')]),
  blockStrategy: z.union([z.literal('1'), z.literal('2'), z.literal('3')]),
  executorTimeout: positiveInteger('超时时间必须是不小于 1 的整数', 1, '请输入超时时间'),
  maxRetryTimes: positiveInteger('最大重试次数必须是不小于 0 的整数', 0, '请输入最大重试次数'),
  retryInterval: positiveInteger('重试间隔必须是不小于 1 的整数', 1, '请输入重试间隔'),
  parallelNum: positiveInteger('并行数必须是不小于 1 的整数', 1, '请输入并行数'),
  jobStatus: z.union([z.literal(0), z.literal(1)]),
  executorType: z.number().nullable(),
  argsType: z.number().nullable()
})

// `z.input` keeps the number fields `number | null`; the refine only narrows the output.
type FormValues = z.input<typeof formSchema>
type NumberFieldName = 'executorTimeout' | 'maxRetryTimes' | 'retryInterval' | 'parallelNum'

const EMPTY_FORM: FormValues = {
  groupName: '',
  jobName: '',
  description: '',
  triggerType: '2',
  triggerInterval: '60',
  taskType: '1',
  executorInfo: '',
  argsStr: '',
  routeKey: '4',
  blockStrategy: '1',
  executorTimeout: 60,
  maxRetryTimes: 3,
  retryInterval: 1,
  parallelNum: 1,
  jobStatus: 0,
  executorType: 1,
  argsType: null
}

function toFormValues(job: JobResp): FormValues {
  const parsedArgsType = job.argsType === null || job.argsType === '' ? null : Number(job.argsType)

  return {
    groupName: job.groupName,
    jobName: job.jobName,
    description: job.description ?? '',
    triggerType: String(job.triggerType) as FormValues['triggerType'],
    triggerInterval: job.triggerInterval,
    taskType: String(job.taskType) as FormValues['taskType'],
    executorInfo: job.executorInfo,
    argsStr: job.argsStr ?? '',
    routeKey: String(job.routeKey) as FormValues['routeKey'],
    blockStrategy: String(job.blockStrategy) as FormValues['blockStrategy'],
    executorTimeout: job.executorTimeout,
    maxRetryTimes: job.maxRetryTimes,
    retryInterval: job.retryInterval,
    parallelNum: job.parallelNum,
    jobStatus: job.jobStatus ?? 0,
    executorType: job.executorType ?? null,
    argsType: parsedArgsType !== null && Number.isFinite(parsedArgsType) ? parsedArgsType : null
  }
}

/** One editable shard parameter; the stable id keeps the row's DOM/focus when others are removed. */
interface ShardArg {
  readonly id: string
  readonly value: string
}

let shardArgSeq = 0

function nextShardArgId() {
  shardArgSeq += 1
  return `shard-arg-${shardArgSeq}`
}

function toShardArgs(values: readonly string[]): ShardArg[] {
  return values.map(value => ({ id: nextShardArgId(), value }))
}

/** Static-slice jobs store their shard parameters as a JSON array of strings. */
function parseShardArgs(argsStr: string | null): ShardArg[] {
  if (!argsStr) {
    return toShardArgs([''])
  }

  try {
    const parsed: unknown = JSON.parse(argsStr)
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
      return toShardArgs(parsed)
    }
  } catch {
    // A hand-edited value that is not JSON falls back to one empty row.
  }

  return toShardArgs([''])
}

interface JobFormDrawerProps {
  /** The job being edited, or `null` to create one. The list row is the only source of it. */
  readonly job: JobResp | null
  readonly open: boolean
  readonly onClose: () => void
  /** The group filter of the list, used as the create default. */
  readonly defaultGroupName?: string
}

/** Create and edit form for one job, with the fields and sections of the Vue client's modal. */
export function JobFormDrawer({ job, open, onClose, defaultGroupName }: JobFormDrawerProps) {
  const queryClient = useQueryClient()
  const formRef = React.useRef<HTMLFormElement>(null)
  const submitLockRef = React.useRef(false)
  const isCreate = job === null

  const groups = useQuery({
    queryKey: jobKeys.groups(),
    queryFn: ({ signal }) => listJobGroups(signal),
    enabled: open
  })

  const groupOptions = React.useMemo(() => {
    const list = groups.data ?? []
    return job?.groupName && !list.includes(job.groupName) ? [job.groupName, ...list] : list
  }, [groups.data, job])

  const groupItems = React.useMemo(() => groupOptions.map(group => ({ value: group, label: group })), [groupOptions])

  const [args, setArgs] = React.useState<ShardArg[]>(() => toShardArgs(['']))
  const [argsError, setArgsError] = React.useState<string | null>(null)
  const [triggerError, setTriggerError] = React.useState<string | null>(null)

  const form = useAppForm({
    defaultValues: EMPTY_FORM,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      const body: JobReq = {
        groupName: value.groupName,
        jobName: value.jobName.trim(),
        description: value.description.trim(),
        triggerType: Number(value.triggerType) as JobTriggerType,
        triggerInterval: value.triggerInterval.trim(),
        executorType: value.executorType,
        taskType: Number(value.taskType) as JobTaskType,
        executorInfo: value.executorInfo.trim(),
        argsStr: value.taskType === '3' ? JSON.stringify(args.map(arg => arg.value)) : value.argsStr,
        argsType: value.argsType,
        routeKey: Number(value.routeKey) as JobRouteKey,
        blockStrategy: Number(value.blockStrategy) as JobBlockStrategy,
        // The schema rejects `null`, so the submitted numbers are always set.
        executorTimeout: Number(value.executorTimeout),
        maxRetryTimes: Number(value.maxRetryTimes),
        retryInterval: Number(value.retryInterval),
        parallelNum: Number(value.parallelNum),
        jobStatus: value.jobStatus
      }

      try {
        if (job) {
          await updateJob(job.id, body)
        } else {
          await createJob(body)
        }

        onClose()
        void queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
        toast.add({ title: job ? '修改成功' : '新增成功', type: 'success' })
      } catch {
        // The HTTP layer already reported the failure.
      }
    }
  })

  useFillFormOnce({
    open,
    isEdit: !isCreate,
    entityKey: job?.id,
    record: job ?? undefined,
    buildValues: ({ isEdit: editing, record }) =>
      editing && record ? toFormValues(record) : { ...EMPTY_FORM, groupName: defaultGroupName ?? '' },
    apply: values => form.reset(values, { keepDefaultValues: true }),
    onFilled: ({ isEdit: editing, record }) => {
      setArgs(editing && record ? parseShardArgs(record.argsStr) : toShardArgs(['']))
      setArgsError(null)
      setTriggerError(null)
    },
    resetOnClose: false
  })

  // A create may open before the groups arrive; fill the first one once they do.
  React.useEffect(() => {
    if (!open || job || groups.data === undefined || form.state.values.groupName) {
      return
    }

    const firstGroup = groups.data[0]
    if (firstGroup) {
      form.setFieldValue('groupName', firstGroup)
    }
  }, [open, job, groups.data, form])

  const updateArg = (id: string, value: string) => {
    setArgs(current => current.map(item => (item.id === id ? { ...item, value } : item)))
    setArgsError(null)
  }

  const addArg = () => {
    setArgs(current => [...current, { id: nextShardArgId(), value: '' }])
    setArgsError(null)
  }

  const removeArg = (id: string) => {
    setArgs(current => current.filter(item => item.id !== id))
    setArgsError(null)
  }

  const submit = async () => {
    if (submitLockRef.current) {
      return
    }
    submitLockRef.current = true

    try {
      const values = form.state.values

      let nextTriggerError: string | null = null
      if (values.triggerType === '2' && (!/^\d+$/.test(values.triggerInterval) || Number(values.triggerInterval) < 1)) {
        nextTriggerError = '间隔时长必须是不小于 1 的整数'
      }
      if (values.triggerType === '3' && !values.triggerInterval.trim()) {
        nextTriggerError = '请输入 Cron 表达式'
      }
      setTriggerError(nextTriggerError)

      let nextArgsError: string | null = null
      if (values.taskType === '3' && (args.length === 0 || args.some(arg => !arg.value.trim()))) {
        nextArgsError = '请填写完整的分片参数'
      }
      setArgsError(nextArgsError)

      await form.validate('submit')
      if (nextTriggerError || nextArgsError) {
        return
      }

      await form.handleSubmit()

      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      })
    } finally {
      submitLockRef.current = false
    }
  }

  const renderNumberField = (name: NumberFieldName, label: string, min: number, unit?: string) => (
    <form.AppField name={name} validators={{ onDynamic: formSchema.shape[name] }}>
      {field => <field.NumberInput label={label} required min={min} placeholder={`请输入${label}`} addonEnd={unit} />}
    </form.AppField>
  )

  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={isCreate ? '新增任务' : '修改任务'}
      icon={<ListChecks className="size-4" />}
      width={40}
      canClose={() => !form.state.isSubmitting}
    >
      <form
        ref={formRef}
        noValidate
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={event => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-4">
              <h3 className="text-sm font-medium text-foreground">基础配置</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="groupName" validators={{ onDynamic: formSchema.shape.groupName }}>
                  {field => {
                    const invalid = field.state.meta.errors.length > 0

                    return (
                      <FormItem
                        id="job-group-name"
                        label="任务组"
                        required
                        // The empty state already explains a missing group, so the error stays hidden then.
                        errors={groupOptions.length > 0 ? field.state.meta.errors : []}
                      >
                        {groups.isPending && groupOptions.length === 0 ? (
                          <Skeleton className="h-8 w-full" />
                        ) : (
                          <Select
                            items={groupItems}
                            value={field.state.value}
                            onValueChange={value => field.handleChange(value ?? '')}
                          >
                            <SelectTrigger id="job-group-name" className="w-full" aria-invalid={invalid}>
                              <SelectValue placeholder="请选择任务组" />
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                              {groupOptions.length > 0 ? (
                                <SelectGroup>
                                  {groupItems.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ) : (
                                <Empty className="p-3">
                                  <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                      <Layers />
                                    </EmptyMedia>
                                    <EmptyTitle>{groups.isError ? '任务组加载失败' : '暂无可用任务组'}</EmptyTitle>
                                    <EmptyDescription>
                                      {groups.isError
                                        ? '请关闭抽屉后重新打开重试'
                                        : '请确认调度执行器已注册任务组后再试'}
                                    </EmptyDescription>
                                  </EmptyHeader>
                                </Empty>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </FormItem>
                    )
                  }}
                </form.Field>

                <form.AppField name="jobName" validators={{ onDynamic: formSchema.shape.jobName }}>
                  {field => <field.TextInput label="任务名称" required maxLength={64} placeholder="请输入任务名称" />}
                </form.AppField>
              </div>

              <form.AppField name="description" validators={{ onDynamic: formSchema.shape.description }}>
                {field => <field.TextareaInput label="描述" maxLength={200} rows={3} placeholder="请输入描述" />}
              </form.AppField>
            </section>

            <section className="flex flex-col gap-4 border-t pt-4">
              <h3 className="text-sm font-medium text-foreground">调度配置</h3>

              <form.Subscribe selector={state => state.values.triggerType}>
                {triggerType => (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <form.Field name="triggerType">
                      {field => (
                        <FormItem id="job-trigger-type" label="触发类型" required errors={[]}>
                          <Select
                            items={JOB_TRIGGER_TYPE_OPTIONS}
                            value={field.state.value}
                            onValueChange={value => {
                              const next = value === '3' ? ('3' as const) : ('2' as const)
                              if (next === field.state.value) {
                                return
                              }
                              field.handleChange(next)
                              form.setFieldValue('triggerInterval', next === '2' ? '60' : '0 * * * * ?')
                              setTriggerError(null)
                            }}
                          >
                            <SelectTrigger id="job-trigger-type" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                              <SelectGroup>
                                {JOB_TRIGGER_TYPE_OPTIONS.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    </form.Field>

                    <form.Field name="triggerInterval" validators={{ onDynamic: formSchema.shape.triggerInterval }}>
                      {field => {
                        const invalid = Boolean(triggerError) || field.state.meta.errors.length > 0

                        return (
                          <FormItem
                            id="job-trigger-interval"
                            label={triggerType === '2' ? '间隔时长' : 'Cron 表达式'}
                            required
                            errors={triggerError ? [{ message: triggerError }] : field.state.meta.errors}
                          >
                            {triggerType === '2' ? (
                              <InputGroup>
                                <InputGroupInput
                                  id="job-trigger-interval"
                                  type="number"
                                  min={1}
                                  value={field.state.value}
                                  onChange={event => {
                                    field.handleChange(event.target.value)
                                    setTriggerError(null)
                                  }}
                                  onBlur={field.handleBlur}
                                  placeholder="请输入间隔时长"
                                  aria-invalid={invalid}
                                />
                                <InputGroupAddon align="inline-end">秒</InputGroupAddon>
                              </InputGroup>
                            ) : (
                              <div className="flex gap-2">
                                <Input
                                  id="job-trigger-interval"
                                  value={field.state.value}
                                  onChange={event => {
                                    field.handleChange(event.target.value)
                                    setTriggerError(null)
                                  }}
                                  onBlur={field.handleBlur}
                                  placeholder="0 * * * * ?"
                                  aria-invalid={invalid}
                                />
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    render={<Button type="button" variant="outline" className="shrink-0" />}
                                  >
                                    常用表达式
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52">
                                    {CRON_PRESETS.map(preset => (
                                      <DropdownMenuItem
                                        key={preset.value}
                                        onClick={() => {
                                          field.handleChange(preset.value)
                                          setTriggerError(null)
                                        }}
                                      >
                                        <span className="flex flex-col">
                                          <span>{preset.label}</span>
                                          <span className="text-xs text-muted-foreground">{preset.value}</span>
                                        </span>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </FormItem>
                        )
                      }}
                    </form.Field>
                  </div>
                )}
              </form.Subscribe>
            </section>

            <section className="flex flex-col gap-4 border-t pt-4">
              <h3 className="text-sm font-medium text-foreground">任务配置</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="taskType">
                  {field => (
                    <FormItem id="job-task-type" label="任务类型" required errors={[]}>
                      <Select
                        items={JOB_TASK_TYPE_OPTIONS}
                        value={field.state.value}
                        onValueChange={value => {
                          field.handleChange(
                            (value === '2' ? '2' : value === '3' ? '3' : '1') as FormValues['taskType']
                          )
                          setArgsError(null)
                        }}
                      >
                        <SelectTrigger id="job-task-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          <SelectGroup>
                            {JOB_TASK_TYPE_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                </form.Field>

                <form.AppField name="executorInfo" validators={{ onDynamic: formSchema.shape.executorInfo }}>
                  {field => (
                    <field.TextInput label="执行器名称" required maxLength={255} placeholder="请输入执行器名称" />
                  )}
                </form.AppField>
              </div>

              <form.Subscribe selector={state => state.values.taskType}>
                {taskType =>
                  taskType === '3' ? (
                    <FormItem
                      label="任务参数"
                      // The hint gives way to the error, so the two never stack.
                      description={argsError ? undefined : '静态切片任务会把每个参数分给一个执行器'}
                      errors={argsError ? [{ message: argsError }] : []}
                    >
                      <div className="flex flex-col gap-2">
                        {args.map((arg, index) => (
                          <div key={arg.id} className="flex items-center gap-2">
                            <Input
                              value={arg.value}
                              onChange={event => updateArg(arg.id, event.target.value)}
                              placeholder={`请输入分片参数 ${index + 1}`}
                              aria-invalid={Boolean(argsError)}
                            />
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon-sm"
                                    onClick={() => removeArg(arg.id)}
                                  />
                                }
                              >
                                <Trash2 />
                              </TooltipTrigger>
                              <TooltipContent side="top">删除该参数</TooltipContent>
                            </Tooltip>
                          </div>
                        ))}
                        <Button type="button" size="sm" variant="outline" onClick={addArg}>
                          <Plus />
                          添加分片参数
                        </Button>
                      </div>
                    </FormItem>
                  ) : (
                    <form.AppField name="argsStr">
                      {field => <field.TextareaInput label="任务参数" rows={3} placeholder="请输入任务参数" />}
                    </form.AppField>
                  )
                }
              </form.Subscribe>
            </section>

            <section className="flex flex-col gap-4 border-t pt-4">
              <h3 className="text-sm font-medium text-foreground">高级配置</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <form.AppField name="routeKey">
                  {field => <field.SelectInput label="路由策略" required options={JOB_ROUTE_KEY_OPTIONS} />}
                </form.AppField>

                <form.AppField name="blockStrategy">
                  {field => <field.SelectInput label="阻塞策略" required options={JOB_BLOCK_STRATEGY_OPTIONS} />}
                </form.AppField>

                {renderNumberField('executorTimeout', '超时时间', 1, '秒')}
                {renderNumberField('maxRetryTimes', '最大重试次数', 0)}
                {renderNumberField('retryInterval', '重试间隔', 1, '秒')}
                {renderNumberField('parallelNum', '并行数', 1)}
              </div>
            </section>
          </div>
        </div>

        <form.AppForm>
          <form.FormFooter onCancel={onClose} />
        </form.AppForm>
      </form>
    </EntityDrawer>
  )
}
