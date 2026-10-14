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

const EMPTY_FORM: FormValues = { roleIds: [] }

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
  const queryClient = useQueryClient()
  const userId = user?.id ?? null

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: EMPTY_FORM })

  const roles = useQuery({
    queryKey: ['system', 'role', 'dict'],
    queryFn: listRoleDict,
    staleTime: LOOKUP_STALE_MS,
    enabled: open
  })

  // Shares its key with the detail and edit drawers, so all three read one cached record. The
  // options make this one refetch every time the dialog opens rather than trust that cache.
  const detail = useUserDetail(userId, { enabled: open, alwaysRefetch: true })

  // Saving without the list would post the seeded ids straight back and report success while
  // the user never saw a single role to tick.
  const isRoleListUnavailable = roles.isPending || roles.isError
  const isDetailLoading = detail.isPending || detail.fetchStatus !== 'idle'
  const isDetailUnavailable = isDetailLoading || detail.isError || !detail.data
  const isFormUnavailable = isRoleListUnavailable || isDetailUnavailable

  // Wait for the opening's request, including when an older response is already cached.
  React.useEffect(() => {
    if (open && !isDetailUnavailable && detail.data) {
      form.reset({ roleIds: (detail.data.roleIds ?? []).map(String) })
    }
  }, [open, isDetailUnavailable, detail.data, form])

  // The picker speaks in strings; this map gives the original id back for the request body.
  const roleIdByValue = React.useMemo(
    () => new Map((roles.data ?? []).map(role => [String(role.value), role.value])),
    [roles.data]
  )

  const onSubmit = async (values: FormValues) => {
    if (user === null || isFormUnavailable) {
      return
    }

    try {
      await assignUserRoles(user.id, {
        roleIds: values.roleIds.map(value => roleIdByValue.get(value) ?? value)
      })

      onClose()
      // One prefix covers both the list and the cached detail.
      void queryClient.invalidateQueries({ queryKey: ['system', 'user'] })
      toast.add({ title: '分配角色成功', type: 'success' })
    } catch {
      // The HTTP layer already reported the failure.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        // Closing mid-save would leave the request in flight with no way to report it.
        if (!nextOpen && !form.formState.isSubmitting) {
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

        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {detail.isError && (
            <p className="text-sm text-destructive">
              用户角色加载失败，
              <button type="button" className="underline" onClick={() => void detail.refetch()}>
                重试
              </button>
            </p>
          )}
          <Controller
            control={form.control}
            name="roleIds"
            render={({ field, fieldState }) => (
              <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                <FieldLabel>角色</FieldLabel>
                <UserRoleSelect
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isDetailUnavailable || form.formState.isSubmitting}
                  invalid={fieldState.invalid}
                  enabled={open}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || isFormUnavailable}>
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
      </DialogContent>
    </Dialog>
  )
}
