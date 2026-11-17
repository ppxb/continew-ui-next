import { z } from 'zod'

import type { UserReq } from '@/lib/api/user'
import { PASSWORD_HINT, PASSWORD_PATTERN } from '@/lib/password'

const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{3,64}$/
const NAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9_-]{2,30}$/
const PHONE_PATTERN = /^(?:0|86|\+86)?1[3-9]\d{9}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/

export const userRules = {
  nickname: z.string().regex(NAME_PATTERN, '昵称长度为 2-30 个字符，支持中文、字母、数字、下划线、短横线').transform(value => value.trim()),
  username: z.string().regex(USERNAME_PATTERN, '用户名长度为 4-64 个字符，支持大小写字母、数字、下划线，且以字母开头').transform(value => value.trim()),
  password: z.string().min(1, '密码不能为空').regex(PASSWORD_PATTERN, PASSWORD_HINT),
  phone: z.string().refine(value => value === '' || PHONE_PATTERN.test(value), '手机号格式不正确').transform(value => value.trim() || undefined),
  email: z.string().max(255, '邮箱长度不能超过 255 个字符').refine(value => value === '' || EMAIL_PATTERN.test(value), '邮箱格式不正确').transform(value => value.trim() || undefined),
  gender: z.literal([0, 1, 2]),
  deptId: z.string().min(1, '请选择所属部门'),
  roleIds: z.array(z.string()).min(1, '请至少选择一个角色'),
  description: z.string().max(200, '描述长度不能超过 200 个字符').transform(value => value.trim() || undefined),
  status: z.literal([1, 2])
}

const userRequestSchema = z.object(userRules).omit({ password: true }).extend({
  phone: userRules.phone.optional(),
  email: userRules.email.optional(),
  description: userRules.description.optional()
})

/** Parse the controlled form boundary and never include a password in the update body. */
export function toUserRequest(values: unknown): UserReq {
  return userRequestSchema.parse(values)
}

export function getUserPassword(values: { password?: unknown }): string {
  return userRules.password.parse(values.password)
}
