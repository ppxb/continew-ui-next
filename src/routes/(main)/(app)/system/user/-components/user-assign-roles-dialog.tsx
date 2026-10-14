import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { ChevronDown } from 'lucide-react'

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
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { listRoleDict } from '@/lib/api/role'
import { assignUserRoles, getUser, type UserResp } from '@/lib/api/user'

import { userLabel } from './user-display'

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

  const detail = useQuery({
    queryKey: ['system', 'user', 'role-assignment', userId],
    queryFn: () => {
      if (userId === null) {
        throw new Error('A user role assignment was requested without an id')
      }

      return getUser(userId)
    },
    enabled: open && userId !== null,
    // Re-enabling this query fetches on every opening, even for the same user.
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })

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
            render={({ field, fieldState }) => {
              // Read from the field instead of `form.watch`, which the React Compiler lint
              // rejects as an API that cannot be memoized safely.
              const selectedRoleNames = (roles.data ?? [])
                .filter(role => field.value.includes(String(role.value)))
                .map(role => role.label)

              return (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel>角色</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between font-normal"
                          aria-invalid={fieldState.invalid}
                          disabled={isDetailUnavailable || form.formState.isSubmitting}
                        />
                      }
                    >
                      <span className={selectedRoleNames.length ? 'truncate' : 'truncate text-muted-foreground'}>
                        {isDetailLoading || roles.isPending
                          ? '加载中…'
                          : detail.isError || roles.isError
                            ? '角色加载失败'
                            : selectedRoleNames.length
                              ? selectedRoleNames.join('、')
                              : '请选择角色'}
                      </span>
                      <ChevronDown className="size-4 opacity-60" />
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="max-h-(--available-height) w-64 gap-0 overflow-y-auto overscroll-contain p-1"
                    >
                      {roles.isPending ? (
                        <div className="flex items-center justify-center p-2">
                          <Spinner />
                        </div>
                      ) : roles.isError ? (
                        <p className="px-2 py-1.5 text-sm text-destructive">
                          角色加载失败，
                          <button type="button" className="underline" onClick={() => void roles.refetch()}>
                            重试
                          </button>
                        </p>
                      ) : (roles.data ?? []).length === 0 ? (
                        <p className="px-2 py-1.5 text-sm text-muted-foreground">暂无可选角色</p>
                      ) : (
                        (roles.data ?? []).map(role => {
                          const value = String(role.value)
                          const checked = field.value.includes(value)

                          return (
                            <div key={value} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                              <Checkbox
                                id={`user-role-${value}`}
                                checked={checked}
                                disabled={isDetailUnavailable || form.formState.isSubmitting}
                                onCheckedChange={next =>
                                  field.onChange(
                                    next ? [...field.value, value] : field.value.filter(item => item !== value)
                                  )
                                }
                              />
                              <Label
                                htmlFor={`user-role-${value}`}
                                className="flex-1 cursor-pointer text-sm font-normal"
                              >
                                {role.label}
                              </Label>
                            </div>
                          )
                        })
                      )}
                    </PopoverContent>
                  </Popover>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )
            }}
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
