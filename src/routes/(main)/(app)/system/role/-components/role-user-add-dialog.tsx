import * as React from 'react'

import { useQuery } from '@tanstack/react-query'

import { Search, UserPlus } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { assignRoleToUsers, listRoleUserIds, roleKeys, type RoleResp } from '@/lib/api/role'
import { listUsers, userKeys, type UserResp } from '@/lib/api/user'
import { getInitials } from '@/lib/utils'

interface RoleUserAddDialogProps {
  readonly role: RoleResp | null
  readonly open: boolean
  readonly onClose: () => void
  readonly onSuccess: () => void
}

export function RoleUserAddDialog({ role, open, onClose, onSuccess }: RoleUserAddDialogProps) {
  const [search, setSearch] = React.useState('')
  const [selectedUserIds, setSelectedUserIds] = React.useState<Set<string | number>>(new Set())
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const roleId = role?.id ?? null

  // Fetch already assigned user IDs for this role
  const assignedQuery = useQuery({
    queryKey: roleKeys.userIds(roleId),
    queryFn: () => (roleId ? listRoleUserIds(roleId) : Promise.resolve([])),
    enabled: open && roleId !== null,
    staleTime: 0
  })

  // Fetch candidate users
  const usersQuery = useQuery({
    queryKey: userKeys.list({ page: 1, size: 50, description: search || undefined }),
    queryFn: () => listUsers({ page: 1, size: 50, description: search || undefined }),
    enabled: open
  })

  // Reset selection on open
  React.useEffect(() => {
    if (open) {
      setSelectedUserIds(new Set())
      setSearch('')
    }
  }, [open])

  const assignedUserIds = React.useMemo(() => {
    return new Set((assignedQuery.data ?? []).map(String))
  }, [assignedQuery.data])

  const candidateUsers: UserResp[] = usersQuery.data?.list ?? []

  const toggleSelectUser = (id: string | number) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAssign = async () => {
    if (!roleId || selectedUserIds.size === 0) return

    setIsSubmitting(true)
    try {
      await assignRoleToUsers(roleId, Array.from(selectedUserIds))
      toast.add({ title: '添加角色成员成功', type: 'success' })
      onSuccess()
      onClose()
    } catch {
      // The HTTP layer already reported the failure.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={next => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-4" />
            <DialogTitle>添加角色成员</DialogTitle>
            {role && <Badge variant="secondary">{role.name}</Badge>}
          </div>
          <DialogDescription>选择系统中现有用户分配到该角色中</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <InputGroup>
            <InputGroupAddon>
              <Search className="size-3.5 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput placeholder="搜索用户名或昵称" value={search} onChange={e => setSearch(e.target.value)} />
          </InputGroup>

          <div className="max-h-72 min-h-48 overflow-y-auto overscroll-contain rounded-md border p-1 select-none">
            {usersQuery.isPending || assignedQuery.isPending ? (
              <div className="flex flex-col gap-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex flex-1 flex-col gap-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : candidateUsers.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
                未找到可添加的用户
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {candidateUsers.map(user => {
                  const idStr = String(user.id)
                  const isAssigned = assignedUserIds.has(idStr)
                  const isSelected = selectedUserIds.has(user.id)
                  const name = user.nickname || user.username

                  return (
                    <div
                      key={idStr}
                      className={`flex items-center justify-between rounded-md px-2 py-1.5 transition-colors ${
                        isAssigned
                          ? 'cursor-not-allowed bg-muted/20 opacity-50'
                          : isSelected
                            ? 'cursor-pointer bg-accent text-accent-foreground'
                            : 'cursor-pointer hover:bg-muted/60'
                      }`}
                      onClick={() => {
                        if (!isAssigned) {
                          toggleSelectUser(user.id)
                        }
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={isAssigned ? true : isSelected}
                          disabled={isAssigned}
                          onCheckedChange={() => {
                            if (!isAssigned) toggleSelectUser(user.id)
                          }}
                          onClick={e => e.stopPropagation()}
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

                      {isAssigned && (
                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                          已在角色中
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span>已选 {selectedUserIds.size} 名用户</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            取消
          </Button>
          <Button type="button" disabled={isSubmitting || selectedUserIds.size === 0} onClick={handleAssign}>
            {isSubmitting ? (
              <>
                <Spinner />
                添加中
              </>
            ) : (
              '确定添加'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
