import { z } from 'zod'

import type { PackageDictResp } from '@/lib/api/package'
import type { TenantReq } from '@/lib/api/tenant'
import { PASSWORD_HINT, PASSWORD_PATTERN } from '@/lib/password'

const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{3,64}$/
const USERNAME_HINT = '管理员用户名长度为 4-64 个字符，支持字母、数字、下划线，且以字母开头'

export const tenantRules = {
  name: z.string().trim().min(1, '请输入租户名称').max(30, '名称长度不能超过 30 个字符'),
  domain: z
    .string()
    .max(255, '域名长度不能超过 255 个字符')
    .refine(value => !value || (/^[^\s/?#]+$/.test(value) && !value.includes('://')), '请输入不含协议的域名或 IP')
    .transform(value => value.trim() || undefined),
  expireTime: z
    .string()
    .refine(value => {
      if (!value) return true
      const date = new Date(value.replace(/-/g, '/'))
      return !Number.isNaN(date.getTime()) && date.getTime() > Date.now()
    }, '过期时间必须是未来时间')
    .transform(value => value || null),
  adminUsername: z
    .string()
    .max(64, '管理员用户名长度不能超过 64 个字符')
    .regex(USERNAME_PATTERN, USERNAME_HINT)
    .transform(value => value.trim()),
  adminPassword: z.string().max(32, '密码长度不能超过 32 个字符').regex(PASSWORD_PATTERN, PASSWORD_HINT),
  packageId: z.string(),
  description: z
    .string()
    .max(200, '描述长度不能超过 200 个字符')
    .transform(value => value.trim() || undefined),
  status: z.literal([1, 2])
}

const tenantRequestSchema = z.object(tenantRules).omit({ adminUsername: true, adminPassword: true }).extend({
  domain: tenantRules.domain.optional(),
  expireTime: tenantRules.expireTime.nullable(),
  description: tenantRules.description.optional()
})

/** Preserve the dictionary's original identifier type without narrowing snowflake strings. */
export function toTenantRequest(values: unknown, packages: readonly PackageDictResp[]): TenantReq {
  const parsed = tenantRequestSchema.parse(values)
  return {
    ...parsed,
    packageId: packages.find(option => String(option.value) === parsed.packageId)?.value ?? parsed.packageId
  }
}

export function getTenantCredentials(values: { adminUsername?: unknown; adminPassword?: unknown }) {
  return {
    adminUsername: tenantRules.adminUsername.parse(values.adminUsername),
    adminPassword: tenantRules.adminPassword.parse(values.adminPassword)
  }
}
