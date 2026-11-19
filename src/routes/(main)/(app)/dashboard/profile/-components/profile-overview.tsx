import { ProDescriptions } from '@/components/pro'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { getProfileColumns } from './profile-columns'
import type { ProfileRecord } from './profile-data'
import { ProfileSocialAccounts } from './profile-social-accounts'

const accountColumns = getProfileColumns('account')

interface ProfileOverviewProps {
  profile: ProfileRecord
}

export function ProfileOverview({ profile }: ProfileOverviewProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-base font-medium">描述</h2>
        <p className="text-sm text-muted-foreground">{profile.bio}</p>
      </div>

      <Separator className="my-4" />

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-base font-medium">账号详情</h2>
        <ProDescriptions columns={accountColumns} dataSource={profile} />
      </div>

      <Separator className="my-4" />

      <div className="grid gap-8 sm:grid-cols-2 xl:gap-12">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium">角色信息</h2>
          {profile.roleNames.length ? (
            <div className="flex flex-wrap gap-2">
              {profile.roleNames.map(role => (
                <Badge key={role} className="rounded-sm" variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">暂无角色</p>
          )}
        </div>

        <ProfileSocialAccounts />
      </div>
    </>
  )
}
