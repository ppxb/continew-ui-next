import { differenceInMonths } from 'date-fns'

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
  return date?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatEngagementLength(registered?: string | null): string | undefined {
  const start = parseBackendDate(registered)

  if (!start) {
    return undefined
  }

  const months = Math.max(0, differenceInMonths(new Date(), start))
  const years = Math.floor(months / 12)
  const rest = months % 12

  if (years === 0) {
    return `${rest} months`
  }

  return rest === 0 ? `${years} years` : `${years} years, ${rest} months`
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
    preferredName: name,
    legalName: name,
    initials: getInitials(name),
    avatar: user.avatar ?? mockProfile.avatar,
    jobTitle: user.roleNames?.length ? user.roleNames.join(' / ') : mockProfile.jobTitle,
    department: user.deptName || mockProfile.department,
    workEmail: user.email || mockProfile.workEmail,
    workPhone: user.phone || mockProfile.workPhone,
    contractorId: String(user.id),
    startDate: formatBackendDate(user.registrationDate) ?? mockProfile.startDate,
    engagementLength: formatEngagementLength(user.registrationDate) ?? mockProfile.engagementLength,
    bio: user.description || mockProfile.bio,
    updatedBy: name,
    updatedAt: formatBackendDate(user.pwdResetTime) ?? mockProfile.updatedAt
  }
}
