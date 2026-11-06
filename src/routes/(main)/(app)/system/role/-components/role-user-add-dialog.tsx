import * as React from 'react'

import { useQuery } from '@tanstack/react-query'

import { UserPlus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { UserPicker } from '@/components/user-picker'
import { useLastRecord } from '@/hooks/use-last-record'
import { assignRoleToUsers, listRoleUserIds, roleKeys, type RoleResp } from '@/lib/api/role'

interface RoleUserAddDialogProps {
  readonly role: RoleResp | null
  readonly open: boolean
  readonly onClose: () => void
  readonly onSuccess: () => void
}

export function RoleUserAddDialog({ role, open, onClose, onSuccess }: RoleUserAddDialogProps) {
  const [selectedUserIds, setSelectedUserIds] = React.useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const shownRole = useLastRecord(role)
  const roleId = shownRole?.id ?? null

  // The ids already in the role, so the list can grey them out instead of offering them again.
  const assignedQuery = useQuery({
    queryKey: roleKeys.userIds(roleId),
    queryFn: ({ signal }) => (roleId ? listRoleUserIds(roleId, signal) : Promise.resolve([])),
    enabled: open && roleId !== null,
    staleTime: 0
  })

  // Reset on close, so reopening never starts from a stale selection.
  React.useEffect(() => {
    if (open) return

    setSelectedUserIds(new Set())
  }, [open])

  const assignedUserIds = React.useMemo(() => new Set((assignedQuery.data ?? []).map(String)), [assignedQuery.data])

  const toggleSelectUser = (id: string) => {
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
            {shownRole && <Badge variant="secondary">{shownRole.name}</Badge>}
          </div>
          <DialogDescription>选择系统中现有用户分配到该角色中</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <UserPicker
            open={open}
            selectedIds={selectedUserIds}
            onToggle={toggleSelectUser}
            isDisabled={user => assignedQuery.isPending || assignedUserIds.has(String(user.id))}
            disabledBadge="已在角色中"
            searchPlaceholder="搜索用户名或昵称"
            emptyText="未找到可添加的用户"
          />

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
