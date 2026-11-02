import { differenceInDays, differenceInMonths, format } from 'date-fns'

import type { UserInfoResp } from '@/lib/api/types'
import { getInitials } from '@/lib/utils'

import { profile as mockProfile, type ProfileRecord } from './profile-data'

/** The backend sends `2026-10-13` and `2026-10-13 06:07:16`. */
function parseBackendDate(value?: string | null): Date | undefined {
  if (!value) {
    return undefined
  }

  const date = new Date(value.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatBackendDate(value?: string | null): string | undefined {
  const date = parseBackendDate(value)
  return date ? format(date, 'yyyy-MM-dd') : undefined
}

function formatGender(gender?: number): string {
  if (gender === 1) {
    return '男'
  }

  if (gender === 2) {
    return '女'
  }

  return '未知'
}

function formatActiveDuration(createdAt?: string | null): string | undefined {
  const start = parseBackendDate(createdAt)

  if (!start) {
    return undefined
  }

  const days = Math.max(0, differenceInDays(new Date(), start))

  if (days < 1) {
    return '不到 1 天'
  }

  if (days < 30) {
    return `${days} 天`
  }

  const months = Math.max(1, differenceInMonths(new Date(), start))

  if (months < 12) {
    return `${months} 个月`
  }

  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest === 0 ? `${years} 年` : `${years} 年 ${rest} 个月`
}

/**
 * Overlays the fields the backend really owns on top of the demo record.
 *
 * `GET /auth/user/info` only covers identity, contact, department, roles and password
 * dates, so every employee-directory field without a source (job level, team, leave,
 * documents, manager, emergency contacts) keeps its mock value.
 */
export function toProfileRecord(user: UserInfoResp | null): ProfileRecord {
  if (!user) {
    return mockProfile
  }

  const name = user.nickname || user.username

  return {
    ...mockProfile,
    name,
    preferredName: user.username,
    legalName: name,
    pronouns: formatGender(user.gender),
    initials: getInitials(name),
    avatar: user.avatar ?? mockProfile.avatar,
    jobTitle: user.roleNames?.length ? user.roleNames.join(' / ') : mockProfile.jobTitle,
    roleNames: user.roleNames ?? [],
    department: user.deptName || mockProfile.department,
    workEmail: user.email || mockProfile.workEmail,
    personalEmail: user.email || mockProfile.personalEmail,
    workPhone: user.phone || mockProfile.workPhone,
    contractorId: String(user.id),
    startDate: formatBackendDate(user.registrationDate) ?? mockProfile.startDate,
    activeDuration: formatActiveDuration(user.registrationDate) ?? mockProfile.activeDuration,
    bio: user.description || mockProfile.bio,
    updatedBy: name,
    updatedAt: formatBackendDate(user.pwdResetTime) ?? mockProfile.updatedAt
  }
}
