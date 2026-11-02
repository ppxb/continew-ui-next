import { BadgeCheck } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

import type { ProfileRecord } from './profile-data'

interface ProfileHeaderProps {
  profile: ProfileRecord
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col gap-5 px-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="size-16 shrink-0 sm:size-20">
          <AvatarImage alt={profile.name} src={profile.avatar} />
          <AvatarFallback>{profile.initials}</AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h1 className="truncate font-heading text-xl leading-6 font-semibold tracking-tight sm:text-2xl sm:leading-7">
              {profile.name}
            </h1>
            <p className="truncate text-sm leading-5 text-muted-foreground">{profile.workEmail}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-sm bg-green-600 text-white" variant="default">
              <BadgeCheck data-icon="inline-start" />
              已验证
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
