import { createFileRoute } from '@tanstack/react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getInitials } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth/auth-provider'

import { PasswordForm } from './-components/password-form'

/** Backend `GenderEnum`: 0 unknown, 1 male, 2 female. */
const GENDER_LABELS: Record<number, string> = {
  0: 'Unknown',
  1: 'Male',
  2: 'Female'
}

export const Route = createFileRoute('/(main)/(app)/profile')({
  component: ProfilePage
})

function ProfileField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm">{value || '—'}</dd>
    </div>
  )
}

function ProfilePage() {
  const user = useAuthStore(state => state.user)
  const name = user?.nickname || user?.username || ''

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-12 rounded-lg">
              <AvatarImage src={user?.avatar || undefined} alt={name} />
              <AvatarFallback className="rounded-lg">{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-base font-medium">{name}</span>
              <span className="truncate text-sm text-muted-foreground">
                {[user?.username ? `@${user.username}` : undefined, user?.deptName].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
          <Separator />
          <dl className="grid gap-3 sm:grid-cols-2">
            <ProfileField label="Email" value={user?.email} />
            <ProfileField label="Phone" value={user?.phone} />
            <ProfileField label="Gender" value={GENDER_LABELS[user?.gender ?? 0]} />
            <ProfileField label="Roles" value={user?.roleNames?.join(', ')} />
            <ProfileField label="Registered" value={user?.registrationDate} />
            <ProfileField label="Password updated" value={user?.pwdResetTime} />
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change the password you use to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
