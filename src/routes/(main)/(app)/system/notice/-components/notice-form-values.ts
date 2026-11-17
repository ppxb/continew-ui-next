import { z } from 'zod'

import type { NoticeReq, NoticeStatus } from '@/lib/api/notice'

export const noticeFormRules = {
  title: z.string().trim().min(1, '请输入标题').max(150, '标题长度不能超过 150 个字符'),
  type: z.string().min(1, '请选择分类'),
  content: z.string().refine(html => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0, '请输入内容'),
  noticeScope: z.enum(['1', '2']).transform(value => value === '2' ? 2 as const : 1 as const),
  noticeUsers: z.array(z.string()).min(1, '请选择通知用户'),
  noticeMethods: z.array(z.string().regex(/^\d+$/).transform(Number).refine(Number.isSafeInteger)).nullable(),
  isTiming: z.boolean(),
  publishTime: z.string().nullable().refine(value => !!value, '请选择发布时间').refine(value => !value || !(new Date(value.replace(/-/g, '/')) <= new Date()), '发布时间不能早于当前时间'),
  isTop: z.boolean()
}

const submittedNoticeSchema = z.object({
  title: z.string(), type: z.string(), content: z.string(), noticeScope: z.literal([1, 2]),
  noticeUsers: z.array(z.string()).optional(), noticeMethods: z.array(z.number().int()).nullable(),
  isTiming: z.boolean(), publishTime: z.string().nullable().optional(), isTop: z.boolean()
})

export function toNoticeRequest(values: unknown, status: NoticeStatus): NoticeReq {
  const value = submittedNoticeSchema.parse(values)
  return {
    ...value,
    noticeUsers: value.noticeScope === 2 ? noticeFormRules.noticeUsers.parse(value.noticeUsers) : null,
    publishTime: value.isTiming ? value.publishTime : null,
    status
  }
}
