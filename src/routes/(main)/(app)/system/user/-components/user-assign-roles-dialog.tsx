import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { ShieldCheck } from 'lucide-react'

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

type FormValues = z.infer<typeof formSchema>

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
  readonly user: UserResp
  readonly initialRoleIds: string[]
  readonly onClose: () => void
}

function UserAssignRolesForm({ user, initialRoleIds, onClose }: UserAssignRolesFormProps) {
  const queryClient = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { roleIds: initialRoleIds }
  })

  const roles = useQuery({
    queryKey: roleKeys.dicts(),
    queryFn: listRoleDict,
    staleTime: LOOKUP_STALE_MS
  })

  // The picker speaks in strings; this map gives the original id back for the request body.
  const roleIdByValue = React.useMemo(
    () => new Map((roles.data ?? []).map(role => [String(role.value), role.value])),
    [roles.data]
  )

  const onSubmit = async (values: FormValues) => {
    try {
      await assignUserRoles(user.id, {
        roleIds: values.roleIds.map(value => roleIdByValue.get(value) ?? value)
      })

      onClose()
      void queryClient.invalidateQueries({ queryKey: userKeys.all })
      toast.add({ title: '分配角色成功', type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Controller
        control={form.control}
        name="roleIds"
        render={({ field, fieldState }) => (
          <Field className="gap-1.5" data-invalid={fieldState.invalid}>
            <FieldLabel>角色</FieldLabel>
            <UserRoleSelect value={field.value} onChange={field.onChange} invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <DialogFooter>
        <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onClose}>
          取消
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
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

/**
 * Replaces one user's role set.
 *
 * Fetches the user's current roles whenever the dialog opens. Saving replaces the whole set,
 * so the selection must not come from a potentially stale list row.
 */
export function UserAssignRolesDialog({ user, open, onClose }: UserAssignRolesDialogProps) {
  const userId = user?.id ?? null
  const [lastUser, setLastUser] = React.useState<UserResp | null>(null)

  // Keep the last user during the close animation, matching the delete and reset dialogs.
  React.useEffect(() => {
    if (user) {
      setLastUser(user)
    }
  }, [user])

  const shownUser = user ?? lastUser
  const shownLabel = userLabel(shownUser)

  // Shares its key with the detail and edit drawers, so all three read one cached record; the hook
  // refetches it on open, so the picker never seeds from a stale list row.
  const detail = useUserDetail(userId, { enabled: open })

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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            <DialogTitle>分配角色</DialogTitle>
          </div>
          <DialogDescription>
            {shownUser ? `为用户「${shownLabel}」分配角色` : '为该用户分配角色'}
          </DialogDescription>
        </DialogHeader>

        {isDetailLoading ? (
          <UserAssignRolesSkeleton onClose={onClose} />
        ) : detail.isError || !detail.data ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-destructive">
              用户角色加载失败，
              <button type="button" className="underline" onClick={() => void detail.refetch()}>
                重试
              </button>
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <UserAssignRolesForm
            key={String(user?.id)}
            user={user!}
            initialRoleIds={(detail.data.roleIds ?? []).map(String)}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
