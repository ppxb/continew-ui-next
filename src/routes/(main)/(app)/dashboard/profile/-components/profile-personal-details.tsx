import { LockKeyhole } from 'lucide-react'

import { ProDescriptions } from '@/components/pro'
import { Badge } from '@/components/ui/badge'

import { getProfileColumns } from './profile-columns'
import type { ProfileRecord } from './profile-data'

const columns = getProfileColumns('personal')

export function PersonalDetails({ profile }: { profile: ProfileRecord }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-base font-medium">个人信息</h2>
          <Badge className="rounded-sm" variant="outline">
            <LockKeyhole data-icon="inline-start" />
            Private
          </Badge>
        </div>
        <ProDescriptions columns={columns} dataSource={profile} />
      </div>
    </>
  )
}
