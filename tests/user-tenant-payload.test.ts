import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { toUserRequest, userRules } from '@/routes/(main)/(app)/system/user/-components/user-form-values'
import { tenantRules, toTenantRequest } from '@/routes/(main)/(app)/tenant/management/-components/tenant-form-values'

const userEditSchema = z.object(userRules).omit({ password: true })
const tenantEditSchema = z.object(tenantRules).omit({ adminUsername: true, adminPassword: true })

describe('user and tenant parsed form payloads', () => {
  it('omits an edit password and empty optional fields without changing department or role snowflake IDs', () => {
    const values = userEditSchema.parse({
      nickname: '测试用户',
      username: 'test_user',
      gender: 1,
      status: 1,
      deptId: '9223372036854775806',
      roleIds: ['9223372036854775805'],
      phone: '',
      email: '',
      description: '  测试描述  ',
      password: 'stale-create-field'
    })
    const body = toUserRequest(values)

    expect(body).toEqual({
      nickname: '测试用户',
      username: 'test_user',
      gender: 1,
      status: 1,
      deptId: '9223372036854775806',
      roleIds: ['9223372036854775805'],
      phone: undefined,
      email: undefined,
      description: '测试描述'
    })
    expect(body).not.toHaveProperty('password')
    expect(() => toUserRequest({ ...values, roleIds: [] })).toThrow('请至少选择一个角色')
  })

  it('retains an edit package ID, preserves the dictionary value type and strips create-only administrator fields', () => {
    const values = tenantEditSchema.parse({
      name: '  测试租户  ',
      domain: '',
      expireTime: '',
      description: '  ',
      status: 1,
      packageId: '9223372036854775806',
      adminUsername: 'stale_admin',
      adminPassword: 'stale-create-field'
    })
    const packages = [
      { label: '测试套餐', value: '9223372036854775806' },
      { label: '安全整数套餐', value: 101 }
    ]
    const body = toTenantRequest(values, packages)

    expect(body).toEqual({
      name: '测试租户',
      domain: undefined,
      expireTime: null,
      description: undefined,
      status: 1,
      packageId: '9223372036854775806'
    })
    expect(body).not.toHaveProperty('adminUsername')
    expect(body).not.toHaveProperty('adminPassword')
    expect(toTenantRequest({ ...values, packageId: '101' }, packages).packageId).toBe(101)
    expect(toTenantRequest(values, []).packageId).toBe('9223372036854775806')
  })
})
