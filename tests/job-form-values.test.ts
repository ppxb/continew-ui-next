import { describe, expect, it } from 'vitest'

import {
  createShardArg,
  jobFormRules,
  parseShardArgs,
  toJobRequest
} from '@/routes/(main)/(app)/schedule/job/-components/job-form-values'

describe('job form payload', () => {
  it('keeps shard text and scheduling status while rejecting empty shard rows', () => {
    const shardArgs = parseShardArgs('["  first  ","9223372036854775806"]')
    const payload = toJobRequest({
      groupName: 'executor',
      jobName: 'job',
      description: '',
      triggerType: 2,
      triggerInterval: '60',
      taskType: 3,
      executorInfo: 'handler',
      shardArgs,
      routeKey: 4,
      blockStrategy: 1,
      executorTimeout: 60,
      maxRetryTimes: 0,
      retryInterval: 1,
      parallelNum: 1,
      jobStatus: 1,
      executorType: null,
      argsType: null
    })
    expect(payload.argsStr).toBe('["  first  ","9223372036854775806"]')
    expect(payload.jobStatus).toBe(1)
    expect(payload.maxRetryTimes).toBe(0)
    expect(payload).not.toHaveProperty('shardArgs')
    expect(jobFormRules.shardArgs.safeParse([]).success).toBe(false)
    expect(jobFormRules.shardArgs.safeParse([createShardArg(' ')]).success).toBe(false)
  })
})
