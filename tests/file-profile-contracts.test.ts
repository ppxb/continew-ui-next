// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { formatFormValues } from '@/components/pro/form/schema'
import type { ProFormInstance, ProValues } from '@/components/pro/typing'
import { passwordColumns } from '@/routes/(main)/(app)/dashboard/profile/-components/password-columns'
import { fileColumns } from '@/routes/(main)/(app)/system/file/-components/file-columns'

function formFor(values: ProValues): ProFormInstance {
  return {
    isSubmitting: false,
    getFieldValue: name => values[name],
    getFieldsValue: () => values,
    getFieldsFormatValue: () => values,
    setFieldsValue: next => {
      Object.assign(values, next)
    },
    resetFields: () => {},
    submit: () => {}
  }
}

describe('file and profile submission contracts', () => {
  it('trims file names without rewriting extensions or submitting metadata', () => {
    const values: ProValues = {
      originalName: '  report.final.pdf  ',
      id: '9007199254740993123',
      extension: 'pdf',
      parentPath: '/'
    }
    const form = formFor(values)
    expect(formatFormValues(fileColumns, values, form)).toEqual({ originalName: 'report.final.pdf' })
    for (const originalName of ['   ', 'folder/name', 'folder\\name']) {
      values.originalName = originalName
      expect(() => formatFormValues(fileColumns, values, form)).toThrow()
    }
  })

  it('checks password confirmation against current values and preserves password bytes', () => {
    const values: ProValues = {
      oldPassword: ' current-test-password ',
      newPassword: ' abc12345 ',
      confirmPassword: 'abc12345'
    }
    const form = formFor(values)
    expect(() => formatFormValues(passwordColumns, values, form)).toThrow('两次输入的新密码不一致')
    values.confirmPassword = values.newPassword
    expect(formatFormValues(passwordColumns, values, form)).toEqual(values)
    for (const newPassword of ['abc1234', 'a1'.repeat(17), 'abcdefgh', '12345678']) {
      values.newPassword = newPassword
      values.confirmPassword = newPassword
      expect(() => formatFormValues(passwordColumns, values, form)).toThrow()
    }
  })
})
