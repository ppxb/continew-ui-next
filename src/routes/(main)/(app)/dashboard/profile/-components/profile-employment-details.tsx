import { ProDescriptions } from '@/components/pro'
import { Separator } from '@/components/ui/separator'

import { getProfileColumns } from './profile-columns'
import type { ProfileRecord } from './profile-data'

const organizationColumns = getProfileColumns('organization')
const contractColumns = getProfileColumns('contract')
const workColumns = getProfileColumns('work')

export function EmploymentDetails({ profile }: { profile: ProfileRecord }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-base font-medium">Role and organization</h2>
        <ProDescriptions columns={organizationColumns} dataSource={profile} />
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-base font-medium">Contract details</h2>
        <ProDescriptions columns={contractColumns} dataSource={profile} />
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-base font-medium">Work arrangement</h2>
        <ProDescriptions columns={workColumns} dataSource={profile} />
      </div>
    </>
  )
}
