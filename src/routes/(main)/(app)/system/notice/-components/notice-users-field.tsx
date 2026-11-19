import * as React from 'react'

import { useQueries, useQuery } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getUser, listUsers, userKeys } from '@/lib/api/user'

import { NoticeUserPicker } from './notice-user-picker'

interface NoticeUsersFieldProps {
  readonly id: string
  readonly value: string[]
  readonly onChange: (value: string[]) => void
  readonly onBlur: () => void
  readonly invalid: boolean
  readonly disabled: boolean
}

export function NoticeUsersField({ id, value, onChange, onBlur, invalid, disabled }: NoticeUsersFieldProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const usersQuery = useQuery({
    queryKey: userKeys.list({ page: 1, size: 100 }),
    queryFn: ({ signal }) => listUsers({ page: 1, size: 100 }, signal)
  })
  const userNames = new Map(
    (usersQuery.data?.list ?? []).map(user => [String(user.id), user.nickname || user.username])
  )
  const unknownIds = Array.from(new Set(value.filter(userId => !userNames.has(userId))))
  const unknownQueries = useQueries({
    queries: unknownIds.map(userId => ({
      queryKey: userKeys.detail(userId),
      queryFn: ({ signal }) => getUser(userId, signal)
    }))
  })
  for (const query of unknownQueries) {
    if (query.data) userNames.set(String(query.data.id), query.data.nickname || query.data.username)
  }

  return (
    <>
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        {value.length ? (
          <div className="flex flex-wrap gap-1">
            {value.map(userId => (
              <Badge key={userId} variant="secondary" className="font-normal">
                {userNames.get(userId) ?? `用户 ${userId}`}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">尚未选择用户</p>
        )}
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={disabled}
          aria-invalid={invalid}
          onBlur={onBlur}
          onClick={() => setPickerOpen(true)}
        >
          <UserPlus />
          选择用户
        </Button>
      </div>
      <NoticeUserPicker
        open={pickerOpen && !disabled}
        selected={value}
        onClose={() => setPickerOpen(false)}
        onConfirm={ids => {
          onChange(ids)
          setPickerOpen(false)
        }}
      />
    </>
  )
}
