import { describe, expect, it } from 'vitest'

import { noticeFormRules, toNoticeRequest } from '@/routes/(main)/(app)/system/notice/-components/notice-form-values'

describe('notice form payload', () => {
  it('preserves dictionary and user strings, clears inactive values and rejects empty rich content', () => {
    const base = {
      title: 'notice', type: '001', content: '<p>正文</p>', noticeMethods: noticeFormRules.noticeMethods.parse(['1', '2']),
      isTop: false, isTiming: false, noticeScope: 1
    }
    const allUsers = toNoticeRequest({ ...base, noticeUsers: ['9223372036854775806'], publishTime: '2099-01-01 09:00:00' }, 1)
    expect(allUsers).toMatchObject({ type: '001', noticeUsers: null, publishTime: null, status: 1, noticeMethods: [1, 2] })
    const selectedUsers = toNoticeRequest({ ...base, noticeScope: 2, noticeUsers: ['9223372036854775806'] }, 3)
    expect(selectedUsers.noticeUsers).toEqual(['9223372036854775806'])
    expect(selectedUsers.status).toBe(3)
    expect(noticeFormRules.content.safeParse('<p>&nbsp;</p>').success).toBe(false)
    expect(noticeFormRules.noticeUsers.safeParse([]).success).toBe(false)
  })
})
