// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { valueTypeMap } from '@/components/pro/field/value-type-map'
import { buildFormDefaults, formatFormValues } from '@/components/pro/form/schema'
import type { ProFormInstance, ProValues } from '@/components/pro'

import { roleColumns, toRolePayload } from '@/routes/(main)/(app)/system/role/-components/role-columns'
import { menuColumns, toMenuPayload } from '@/routes/(main)/(app)/system/menu/-components/menu-columns'

function formFor(values: ProValues): ProFormInstance {
  return {
    isSubmitting: false,
    getFieldValue: name => values[name],
    getFieldsValue: () => values,
    getFieldsFormatValue: () => values,
    setFieldsValue: next => { Object.assign(values, next) },
    resetFields: () => { throw new Error('Reset is not part of payload formatting') },
    submit: () => { throw new Error('Submit is not part of payload formatting') }
  }
}

describe('organization entity conditional payloads', () => {
  it('validates external menu routes and excludes stale fields after switching to a button', () => {
    const columns = menuColumns()
    const values = buildFormDefaults(columns, valueTypeMap, {
      type: 2, title: '  用户管理  ', parentId: '9223372036854775806', path: '/system/user',
      isExternal: true, isHidden: true, isCache: true, permission: ' system:user:create '
    })
    const form = formFor(values)
    expect(() => formatFormValues(columns, values, form)).toThrow('外链地址格式不正确')
    values.path = 'https://example.com'
    expect(toMenuPayload(formatFormValues(columns, values, form))).toMatchObject({
      title: '用户管理', parentId: '9223372036854775806', path: 'https://example.com', isExternal: true
    })
    values.type = 3
    values.path = 'not-a-url'
    values.component = 'x'.repeat(256)
    expect(toMenuPayload(formatFormValues(columns, values, form))).toMatchObject({
      type: 3, parentId: '9223372036854775806', permission: 'system:user:create',
      path: null, icon: null, name: null, component: null, redirect: null,
      isExternal: false, isHidden: false, isCache: false
    })
  })

  it('requires custom role departments but clears them for non-custom numeric scopes', () => {
    const columns = roleColumns()
    const values = buildFormDefaults(columns, valueTypeMap, {
      name: '研发角色', code: 'Developer', dataScope: 5, description: '  研发团队  '
    })
    const form = formFor(values)
    expect(() => formatFormValues(columns, values, form)).toThrow('自定义数据权限下必须至少选择一个部门')
    values.deptIds = ['9223372036854775806']
    values.deptCheckStrictly = true
    expect(toRolePayload(formatFormValues(columns, values, form))).toMatchObject({
      dataScope: 5, deptIds: ['9223372036854775806'], deptCheckStrictly: true, description: '研发团队'
    })
    values.dataScope = 2
    expect(toRolePayload(formatFormValues(columns, values, form))).toMatchObject({
      dataScope: 2, deptIds: [], deptCheckStrictly: false
    })
  })
})
