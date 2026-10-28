import * as React from 'react'

import { useQuery } from '@tanstack/react-query'

import { Search, UserPlus } from 'lucide-react'

import { QueryState } from '@/components/query-state'
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
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { assignRoleToUsers, listRoleUserIds, roleKeys, type RoleResp } from '@/lib/api/role'
import { listUsers, userKeys, type UserResp } from '@/lib/api/user'
import { getInitials } from '@/lib/utils'

interface RoleUserAddDialogProps {
  readonly role: RoleResp | null
  readonly open: boolean
  readonly onClose: () => void
  readonly onSuccess: () => void
}

function RoleUserAddSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 py-1">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface CandidateUserRowProps {
  readonly user: UserResp
  readonly isAssigned: boolean
  readonly isSelected: boolean
  readonly onToggle: () => void
}

function CandidateUserRow({ user, isAssigned, isSelected, onToggle }: CandidateUserRowProps) {
  const name = user.nickname || user.username
  const rowClassName = isAssigned
    ? 'cursor-not-allowed bg-muted/20 opacity-50'
    : isSelected
      ? 'cursor-pointer bg-accent text-accent-foreground'
      : 'cursor-pointer hover:bg-accent/60'

  return (
    <div
      className={`flex items-center justify-between rounded-md px-2 py-1.5 transition-colors ${rowClassName}`}
      onClick={() => {
        if (!isAssigned) onToggle()
      }}
    >
      <div className="flex items-center gap-2.5">
        <Checkbox
          checked={isAssigned || isSelected}
          disabled={isAssigned}
          onCheckedChange={onToggle}
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

      {isAssigned && (
        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
          已在角色中
        </Badge>
      )}
    </div>
  )
}

export function RoleUserAddDialog({ role, open, onClose, onSuccess }: RoleUserAddDialogProps) {
  const [search, setSearch] = React.useState('')
  const [selectedUserIds, setSelectedUserIds] = React.useState<Set<string | number>>(new Set())
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const roleId = role?.id ?? null
  const keyword = useDebouncedValue(search).trim()

  // The ids already in the role, so the list can grey them out instead of offering them again.
  const assignedQuery = useQuery({
    queryKey: roleKeys.userIds(roleId),
    queryFn: ({ signal }) => (roleId ? listRoleUserIds(roleId, signal) : Promise.resolve([])),
    enabled: open && roleId !== null,
    staleTime: 0
  })

  const candidateParams = { page: 1, size: 50, description: keyword || undefined }

  const candidateQuery = useQuery({
    queryKey: userKeys.list(candidateParams),
    queryFn: ({ signal }) => listUsers(candidateParams, signal),
    enabled: open
  })

  // Reset on close, so reopening never starts from a stale keyword or a stale selection.
  React.useEffect(() => {
    if (open) return

    setSelectedUserIds(new Set())
    setSearch('')
  }, [open])

  const assignedUserIds = React.useMemo(() => new Set((assignedQuery.data ?? []).map(String)), [assignedQuery.data])

  const candidateUsers = candidateQuery.data?.list ?? []

  const toggleSelectUser = (id: string | number) => {
    setSelectedUserIds(previous => {
      const next = new Set(previous)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  const handleAssign = async () => {
    if (roleId === null || selectedUserIds.size === 0) return

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

  const isLoading = candidateQuery.isPending || assignedQuery.isPending
  const isLoadError = !isLoading && (candidateQuery.isError || assignedQuery.isError)

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) onClose()
      }}
    >
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
            {isLoading ? (
              <RoleUserAddSkeleton />
            ) : isLoadError ? (
              <QueryState
                state="error"
                title="用户列表加载失败"
                className="p-6"
                onRetry={() => {
                  void candidateQuery.refetch()
                  void assignedQuery.refetch()
                }}
              />
            ) : candidateUsers.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
                未找到可添加的用户
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {candidateUsers.map(user => (
                  <CandidateUserRow
                    key={user.id}
                    user={user}
                    isAssigned={assignedUserIds.has(String(user.id))}
                    isSelected={selectedUserIds.has(user.id)}
                    onToggle={() => toggleSelectUser(user.id)}
                  />
                ))}
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
