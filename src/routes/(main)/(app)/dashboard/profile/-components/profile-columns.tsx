import type { ProColumns } from '@/components/pro'
import { StatusCell } from '@/components/status-cell'

import type { ProfileRecord } from './profile-data'

export type ProfileSection =
  | 'account'
  | 'personal'
  | 'organization'
  | 'contract'
  | 'work'
  | 'leaveBalance'
  | 'leaveUpcoming'

type ProfileColumn = ProColumns<ProfileRecord> & { section: ProfileSection }

export const profileColumns = [
  { section: 'account', key: 'accountId', title: '用户 ID', dataIndex: 'contractorId' },
  { section: 'account', key: 'accountDepartment', title: '部门', dataIndex: 'department' },
  { section: 'account', key: 'accountCreated', title: '创建时间', dataIndex: 'startDate' },
  {
    section: 'account',
    key: 'accountStatus',
    title: '状态',
    dataIndex: 'engagementStatus',
    render: (_, profile) => <StatusCell status={profile.engagementStatus === 'Active' ? 1 : 2} />
  },
  { section: 'account', title: '账户活跃时间', dataIndex: 'activeDuration' },
  { section: 'personal', title: '用户名', dataIndex: 'preferredName' },
  { section: 'personal', title: '昵称', dataIndex: 'legalName' },
  { section: 'personal', title: '个人邮箱', dataIndex: 'personalEmail' },
  { section: 'personal', title: '性别', dataIndex: 'pronouns' },
  { section: 'personal', title: '手机号码', dataIndex: 'workPhone' },
  { section: 'organization', title: 'Job title', dataIndex: 'jobTitle' },
  { section: 'organization', title: 'Team', dataIndex: 'team' },
  { section: 'organization', title: 'Job level', dataIndex: 'jobLevel' },
  {
    section: 'organization',
    key: 'organizationManager',
    title: 'Manager',
    dataIndex: 'manager',
    render: (_, profile) => profile.manager.name
  },
  { section: 'organization', key: 'organizationDepartment', title: 'Department', dataIndex: 'department' },
  { section: 'organization', title: 'Current project', dataIndex: 'currentProject' },
  { section: 'contract', key: 'contractId', title: 'Contractor ID', dataIndex: 'contractorId' },
  { section: 'contract', key: 'contractStatus', title: 'Engagement status', dataIndex: 'engagementStatus' },
  { section: 'contract', title: 'Employment type', dataIndex: 'employmentType' },
  { section: 'contract', title: 'Contracting entity', dataIndex: 'contractingEntity' },
  { section: 'contract', key: 'contractStart', title: 'Start date', dataIndex: 'startDate' },
  { section: 'contract', title: 'Last working day', dataIndex: 'lastWorkingDay' },
  { section: 'contract', title: 'Notice period', dataIndex: 'noticePeriod' },
  { section: 'work', title: 'Workplace', dataIndex: 'workplace' },
  { section: 'work', title: 'Time zone', dataIndex: 'timeZone' },
  { section: 'work', title: 'Weekly hours', dataIndex: 'weeklyHours' },
  { section: 'work', title: 'Schedule', dataIndex: 'schedule' },
  { section: 'leaveBalance', title: 'Policy', dataIndex: 'leavePolicy' },
  { section: 'leaveBalance', title: 'Carried over', dataIndex: 'carriedOverLeave' },
  { section: 'leaveBalance', title: 'Annual allowance', dataIndex: 'annualLeaveAllowance' },
  { section: 'leaveBalance', title: 'Used this year', dataIndex: 'usedLeave' },
  { section: 'leaveBalance', title: 'Remaining', dataIndex: 'remainingLeave' },
  { section: 'leaveBalance', title: 'Scheduled', dataIndex: 'scheduledLeave' },
  { section: 'leaveUpcoming', title: 'Next leave', dataIndex: 'nextLeave' },
  { section: 'leaveUpcoming', title: 'Pending requests', dataIndex: 'pendingLeaveRequests' },
  { section: 'leaveUpcoming', title: 'Leave year', dataIndex: 'leaveYear' },
  {
    section: 'leaveUpcoming',
    key: 'leaveApprover',
    title: 'Approver',
    dataIndex: 'manager',
    render: (_, profile) => profile.manager.name
  }
] as const satisfies readonly ProfileColumn[]

export function getProfileColumns(section: ProfileSection): readonly ProColumns<ProfileRecord>[] {
  return profileColumns.filter(column => column.section === section)
}
