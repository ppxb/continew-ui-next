import * as React from 'react'

import { revalidateLogic, useForm, useSelector } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { ShieldCheck } from 'lucide-react'

import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useLastRecord } from '@/hooks/use-last-record'
import { listRoleDict, roleKeys } from '@/lib/api/role'
import { assignUserRoles, userKeys, type UserResp } from '@/lib/api/user'

import { userLabel } from './user-display'
import { useUserDetail } from './use-user-detail'
import { UserRoleSelect } from './user-role-select'

/** Roles barely change, so reopening the dialog should not refetch them. */
const LOOKUP_STALE_MS = 5 * 60_000

const formSchema = z.object({
  roleIds: z.array(z.string()).min(1, '请至少选择一个角色')
})

function UserAssignRolesSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-9 w-full" />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button disabled>保存</Button>
      </DialogFooter>
    </div>
  )
}

interface UserAssignRolesFormProps {
  readonly userId: string | number
  readonly initialRoleIds: string[]
  readonly onClose: () => void
}

function UserAssignRolesForm({ userId, initialRoleIds, onClose }: UserAssignRolesFormProps) {
  const queryClient = useQueryClient()

  const roles = useQuery({
    queryKey: roleKeys.dicts(),
    queryFn: ({ signal }) => listRoleDict(signal),
    staleTime: LOOKUP_STALE_MS
  })

  // The picker speaks in strings; this map gives the original id back for the request body.
  const roleIdByValue = React.useMemo(
    () => new Map((roles.data ?? []).map(role => [String(role.value), role.value])),
    [roles.data]
  )

  const form = useForm({
    defaultValues: { roleIds: initialRoleIds },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value }) => {
      try {
        await assignUserRoles(userId, {
          roleIds: value.roleIds.map(selected => roleIdByValue.get(selected) ?? selected)
        })
      } catch {
        // The HTTP layer already reported the failure.
        return
      }

      onClose()
      void queryClient.invalidateQueries({ queryKey: userKeys.all })
      toast.add({ title: '分配角色成功', type: 'success' })
    }
  })

  const isSubmitting = useSelector(form.store, state => state.isSubmitting)

  const submit = async () => {
    await form.validate('submit')
    await form.handleSubmit()
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={event => {
        event.preventDefault()
        void submit()
      }}
    >
      <form.Field name="roleIds" validators={{ onDynamic: formSchema.shape.roleIds }}>
        {field => {
          const invalid = field.state.meta.errors.length > 0

          return (
            <Field data-invalid={invalid}>
              <FieldLabel>角色</FieldLabel>
              <UserRoleSelect
                value={field.state.value}
                onChange={field.handleChange}
                disabled={isSubmitting}
                invalid={invalid}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )
        }}
      </form.Field>

      <DialogFooter>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner />
              保存中
            </>
          ) : (
            '保存'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface UserAssignRolesDialogProps {
  /** The user whose roles are being reassigned, or `null` before the first one is picked. */
  readonly user: UserResp | null
  readonly open: boolean
  readonly onClose: () => void
}

/** Replaces one user's roles; the current set is fetched when the dialog opens. */
export function UserAssignRolesDialog({ user, open, onClose }: UserAssignRolesDialogProps) {
  const userId = user?.id ?? null
  const shownUser = useLastRecord(user)
  const shownLabel = userLabel(shownUser)

  // Shares its key with the detail and edit drawers, so all three read one cached record; the hook
  // refetches it on open, so the picker never seeds from a stale list row.
  const detail = useUserDetail(userId, { enabled: open, refreshOnOpen: true })

  const isDetailLoading = detail.isPending || detail.fetchStatus !== 'idle'

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            <DialogTitle>分配角色</DialogTitle>
          </div>
          <DialogDescription>{shownUser ? `为用户「${shownLabel}」分配角色` : '为该用户分配角色'}</DialogDescription>
        </DialogHeader>

        {isDetailLoading ? (
          <UserAssignRolesSkeleton onClose={onClose} />
        ) : detail.isError || !detail.data ? (
          <div className="flex flex-col gap-4">
            <QueryState state="error" title="用户角色加载失败" onRetry={() => void detail.refetch()} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <UserAssignRolesForm
            key={String(detail.data.id)}
            userId={detail.data.id}
            initialRoleIds={(detail.data.roleIds ?? []).map(String)}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
