import { describe, expect, it, vi } from 'vitest'

import { buildFormDefaults, formatFormValues } from '@/components/pro/form/schema'
import { valueTypeMap } from '@/components/pro/field/value-type-map'
import type { ProValues } from '@/components/pro'
import type { SmsConfigResp } from '@/lib/api/sms'

import { createSmsColumns, toSmsPayload, type SmsSubmitValues } from '@/routes/(main)/(app)/system/config/-components/sms/columns'

describe('SMS configuration submission', () => {
  it('requires a create secret, omits an empty edit secret, and validates JSON and cleared counters', () => {
    const columns = createSmsColumns({
      supplierOptions: [{ label: '阿里云', value: 'alibaba' }],
      onSupplierChange: vi.fn(),
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
    const submit = (entity?: SmsConfigResp) => toSmsPayload(formatFormValues(columns, values, form, entity) as unknown as SmsSubmitValues)
    Object.assign(values, { name: ' channel ', accessKey: ' sample-access ', templateId: ' sample-template ' })
    expect(() => submit()).toThrow('请输入 Secret Key')
    values.secretKey = ' sample-secret '
    expect(submit()).toMatchObject({ name: 'channel', accessKey: 'sample-access', secretKey: 'sample-secret', templateId: 'sample-template', weight: 1, retryInterval: 5, maxRetries: 0, maximum: 100 })

    const entity: SmsConfigResp = {
      id: '9007199254740993001', name: 'channel', supplier: 'alibaba', accessKey: 'sample-access', templateId: 'sample-template', isDefault: false, status: 1
    }
    Object.assign(values, buildFormDefaults(columns, valueTypeMap, {}, entity, form))
    expect(submit(entity).secretKey).toBeUndefined()
    values.supplierConfig = '{invalid}'
    expect(() => submit(entity)).toThrow('扩展配置必须为合法的 JSON 格式')
    values.supplierConfig = ' {"sdkAppId":"sample"} '
    expect(submit(entity).supplierConfig).toBe('{"sdkAppId":"sample"}')
    values.weight = null
    expect(() => submit(entity)).toThrow('请输入负载均衡权重')
    expect(values.weight).toBeNull()
  })
})
