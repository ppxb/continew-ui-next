import { z } from 'zod'

import type { ProColumns } from '@/components/pro'

export interface PasswordFormValues {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

/** Keep the existing backend PASSWORD policy, without trimming password bytes. */
export const newPasswordRule = z.string()
  .min(8, '新密码长度为 8-32 个字符')
  .max(32, '新密码长度为 8-32 个字符')
  .regex(/(?=.*\d)(?=.*[a-z])/, '新密码至少包含一个字母和一个数字')

export const passwordColumns = [
  {
    title: '当前密码', dataIndex: 'oldPassword', valueType: 'password',
    formItemProps: { rules: z.string().min(1, '请输入当前密码') },
    fieldProps: { autoComplete: 'current-password' }
  },
  {
    title: '新密码', dataIndex: 'newPassword', valueType: 'password',
    formItemProps: { rules: newPasswordRule },
    fieldProps: { autoComplete: 'new-password' }
  },
  {
    title: '确认新密码', dataIndex: 'confirmPassword', valueType: 'password', dependencies: ['newPassword'],
    formItemProps: form => ({ rules: z.string().min(1, '请再次输入新密码').refine(value => value === form.getFieldValue('newPassword'), '两次输入的新密码不一致') }),
    fieldProps: { autoComplete: 'new-password' }
  }
] as const satisfies readonly ProColumns<PasswordFormValues>[]
