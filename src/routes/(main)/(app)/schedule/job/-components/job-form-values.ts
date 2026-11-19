import { z } from 'zod'

import type { JobReq, JobResp } from '@/lib/api/job'

export interface ShardArg {
  readonly id: string
  readonly value: string
}

export interface JobRecord extends JobResp {
  shardArgs?: ShardArg[]
}

let shardArgSequence = 0
export function createShardArg(value = ''): ShardArg {
  shardArgSequence += 1
  return { id: `shard-arg-${shardArgSequence}`, value }
}

export function parseShardArgs(value: string | null): ShardArg[] {
  if (value) {
    try {
      const parsed: unknown = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) return parsed.map(createShardArg)
    } catch {
      // Preserve the existing fallback for hand-edited non-JSON parameters.
    }
  }
  return [createShardArg()]
}

const positiveInteger = (message: string, min: number, emptyMessage: string) =>
  z
    .number()
    .int(message)
    .min(min, message)
    .nullable()
    .refine(value => value !== null, emptyMessage)

export const jobFormRules = {
  groupName: z.string().min(1, '请选择任务组'),
  jobName: z.string().trim().min(1, '请输入任务名称').max(64, '任务名称不能超过 64 个字符'),
  description: z
    .string()
    .max(200, '描述不能超过 200 个字符')
    .transform(value => value.trim()),
  triggerType: z.enum(['2', '3']).transform(value => (value === '3' ? (3 as const) : (2 as const))),
  taskType: z
    .enum(['1', '2', '3'])
    .transform(value => (value === '3' ? (3 as const) : value === '2' ? (2 as const) : (1 as const))),
  executorInfo: z.string().trim().min(1, '请输入执行器名称').max(255, '执行器名称不能超过 255 个字符'),
  argsStr: z.string(),
  shardArgs: z
    .array(z.object({ id: z.string(), value: z.string() }))
    .refine(values => values.length > 0 && values.every(item => item.value.trim()), '请填写完整的分片参数'),
  routeKey: z
    .enum(['1', '2', '3', '4'])
    .transform(value =>
      value === '4' ? (4 as const) : value === '3' ? (3 as const) : value === '2' ? (2 as const) : (1 as const)
    ),
  blockStrategy: z
    .enum(['1', '2', '3'])
    .transform(value => (value === '3' ? (3 as const) : value === '2' ? (2 as const) : (1 as const))),
  executorTimeout: positiveInteger('超时时间必须是不小于 1 的整数', 1, '请输入超时时间'),
  maxRetryTimes: positiveInteger('最大重试次数必须是不小于 0 的整数', 0, '请输入最大重试次数'),
  retryInterval: positiveInteger('重试间隔必须是不小于 1 的整数', 1, '请输入重试间隔'),
  parallelNum: positiveInteger('并行数必须是不小于 1 的整数', 1, '请输入并行数'),
  jobStatus: z.literal([0, 1]),
  executorType: z.number().nullable(),
  argsType: z.number().nullable()
}

const submittedJobSchema = z.object({
  groupName: z.string(),
  jobName: z.string(),
  description: z.string(),
  triggerType: z.literal([2, 3]),
  triggerInterval: z.string(),
  taskType: z.literal([1, 2, 3]),
  executorInfo: z.string(),
  argsStr: z.string().optional(),
  shardArgs: jobFormRules.shardArgs.optional(),
  routeKey: z.literal([1, 2, 3, 4]),
  blockStrategy: z.literal([1, 2, 3]),
  executorTimeout: z.number(),
  maxRetryTimes: z.number(),
  retryInterval: z.number(),
  parallelNum: z.number(),
  jobStatus: z.literal([0, 1]),
  executorType: z.number().nullable(),
  argsType: z.number().nullable()
})

export function toJobRequest(values: unknown): JobReq {
  const value = submittedJobSchema.parse(values)
  const { shardArgs, ...body } = value
  return {
    ...body,
    argsStr:
      value.taskType === 3
        ? JSON.stringify(jobFormRules.shardArgs.parse(shardArgs).map(arg => arg.value))
        : value.argsStr
  }
}
