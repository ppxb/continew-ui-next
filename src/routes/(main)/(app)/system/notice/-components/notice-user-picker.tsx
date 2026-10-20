import * as React from 'react'

import { useQuery } from '@tanstack/react-query'

import { Search, UserPlus } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { listUsers, userKeys, type UserResp } from '@/lib/api/user'
import { getInitials } from '@/lib/utils'

interface NoticeUserPickerProps {
  readonly open: boolean
  readonly selected: string[]
  readonly onClose: () => void
  readonly onConfirm: (ids: string[]) => void
}

const EMPTY_USERS: UserResp[] = []

/** The Vue page uses a user-selection modal; this is the same picker in the project's dialog style. */
export function NoticeUserPicker({ open, selected, onClose, onConfirm }: NoticeUserPickerProps) {
  const [search, setSearch] = React.useState('')
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // Search runs on the server so users beyond the first page stay selectable.
  const usersQuery = useQuery({
    queryKey: userKeys.list({ page: 1, size: 100, description: search.trim() || undefined }),
    queryFn: () => listUsers({ page: 1, size: 100, description: search.trim() || undefined }),
    enabled: open
  })

  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set(selected))
      setSearch('')
    }
  }, [open, selected])

  const users = usersQuery.data?.list ?? EMPTY_USERS

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={next => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-4" />
            <DialogTitle>选择通知用户</DialogTitle>
          </div>
          <DialogDescription>通知范围选择“指定用户”时，公告只发送给这里选中的用户</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <InputGroup>
            <InputGroupAddon>
              <Search className="size-3.5 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="搜索用户名、昵称或部门"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </InputGroup>

          <div className="max-h-72 min-h-48 overflow-y-auto overscroll-contain rounded-md border p-1 select-none">
            {usersQuery.isPending ? (
              <div className="flex flex-col gap-2 p-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex items-center gap-3 py-1">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex flex-1 flex-col gap-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">未找到用户</div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {users.map(user => {
                  const id = String(user.id)
                  const isSelected = selectedIds.has(id)
                  const name = user.nickname || user.username

                  return (
                    <div
                      key={id}
                      className={`flex items-center justify-between rounded-md px-2 py-1.5 transition-colors ${
                        isSelected ? 'bg-accent text-accent-foreground' : 'cursor-pointer hover:bg-muted/60'
                      }`}
                      onClick={() => toggleSelect(id)}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(id)}
                          onClick={event => event.stopPropagation()}
                          className="size-4"
                        />
                        <Avatar className="size-7">
                          <AvatarImage src={user.avatar ?? undefined} alt="" />
                          <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs font-medium">{name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {user.username} {user.deptName ? `· ${user.deptName}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>已选 {selectedIds.size} 名用户</span>
            {selectedIds.size > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setSelectedIds(new Set())}
              >
                清空
              </Button>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={() => onConfirm(Array.from(selectedIds))}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
