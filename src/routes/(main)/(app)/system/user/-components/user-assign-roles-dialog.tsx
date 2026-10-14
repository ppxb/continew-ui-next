import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

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
import { listRoleDict } from '@/lib/api/role'
import { assignUserRoles, type UserResp } from '@/lib/api/user'

import { useUserDetail } from './use-user-detail'
import { userLabel } from './user-display'
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
    queryKey: ['system', 'role', 'dict'],
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
      void queryClient.invalidateQueries({ queryKey: ['system', 'user'] })
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
            <UserRoleSelect
              value={field.value}
              onChange={field.onChange}
              disabled={form.formState.isSubmitting}
              invalid={fieldState.invalid}
            />
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

  // Shares its key with the detail and edit drawers, so all three read one cached record. The
  // options make this one refetch every time the dialog opens rather than trust that cache.
  const detail = useUserDetail(userId, { enabled: open, alwaysRefetch: true })

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
          <DialogTitle>分配角色</DialogTitle>
          <DialogDescription>
            {user === null ? '为该用户分配角色。' : `为「${userLabel(user)}」分配角色，保存后以当前勾选结果为准。`}
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
