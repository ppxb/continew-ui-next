import { ProDescriptions } from '@/components/pro'
import { Separator } from '@/components/ui/separator'

import { getProfileColumns } from './profile-columns'
import type { ProfileRecord } from './profile-data'

const balanceColumns = getProfileColumns('leaveBalance')
const upcomingColumns = getProfileColumns('leaveUpcoming')

export function TimeOffDetails({ profile }: { profile: ProfileRecord }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-base font-medium">Leave balance</h2>
        <ProDescriptions columns={balanceColumns} dataSource={profile} />
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-base font-medium">Upcoming and approvals</h2>
        <ProDescriptions columns={upcomingColumns} dataSource={profile} />
      </div>
    </>
  )
}
