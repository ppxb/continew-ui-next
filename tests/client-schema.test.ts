import { describe, expect, it, vi } from 'vitest'

import { buildFormDefaults, formatFormValues } from '@/components/pro/form/schema'
import { valueTypeMap } from '@/components/pro/field/value-type-map'
import type { ProValues } from '@/components/pro'

import { AUTH_TYPE_OPTIONS, createClientColumns, LOGOUT_MODE_PRESETS, REPLACED_RANGE_PRESETS, toClientPayload, type ClientSubmitValues } from '@/routes/(main)/(app)/system/config/-components/client/columns'

describe('client configuration submission', () => {
  it('rejects cleared numeric text and preserves conditional login requirements and payload omissions', () => {
    const columns = createClientColumns({
      clientTypeOptions: [{ label: 'PC网页端', value: 'PC' }],
      authTypeOptions: AUTH_TYPE_OPTIONS,
      replacedRangeOptions: REPLACED_RANGE_PRESETS,
      logoutModeOptions: LOGOUT_MODE_PRESETS,
      onAction: vi.fn()
    })
    const values = buildFormDefaults(columns, valueTypeMap)
    const form = {
      isSubmitting: false,
      getFieldValue: (name: string) => values[name],
      getFieldsValue: () => values,
      getFieldsFormatValue: () => values,
      setFieldsValue: (next: Partial<ProValues>) => { Object.assign(values, next) },
      resetFields: vi.fn(),
      submit: vi.fn()
    }
    const submit = () => toClientPayload(formatFormValues(columns, values, form) as unknown as ClientSubmitValues)

    expect(submit()).toMatchObject({ activeTimeout: 1800, timeout: 86400, refreshTokenTimeout: 2592000, maxLoginCount: -1 })
    values.activeTimeout = ''
    expect(submit).toThrow('请输入有效整数')
    expect(values.activeTimeout).toBe('')
    values.activeTimeout = '-1'
    values.maxLoginCount = ''
    expect(submit).toThrow('请输入有效整数')
    expect(values.maxLoginCount).toBe('')

    values.isConcurrent = false
    values.maxLoginCount = '-1'
    expect(submit).toThrow('不允许并发登录时必须选择顶人下线的范围')
    values.replacedRange = 'ALL_DEVICE_TYPE'
    values.overflowLogoutMode = 'KICKOUT'
    expect(submit()).toMatchObject({ activeTimeout: -1, replacedRange: 'ALL_DEVICE_TYPE', maxLoginCount: -1, overflowLogoutMode: undefined })

    values.isConcurrent = true
    values.maxLoginCount = '2'
    values.overflowLogoutMode = undefined
    expect(submit).toThrow('设置最大登录数量时必须选择溢出人数的下线方式')
    values.overflowLogoutMode = 'KICKOUT'
    expect(submit()).toMatchObject({ replacedRange: undefined, maxLoginCount: 2, overflowLogoutMode: 'KICKOUT' })
    values.maxLoginCount = '0'
    expect(submit).toThrow('最大登录数量只能为 -1 或正整数')
  })
})
