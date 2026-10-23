import { useId } from 'react'

import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'

import { QueryState } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import { listRoleDict, roleKeys } from '@/lib/api/role'

/** Roles barely change, so reopening the picker should not refetch them. */
const LOOKUP_STALE_MS = 5 * 60_000

interface UserRoleSelectProps {
  readonly value: string[]
  readonly onChange: (nextValue: string[]) => void
  readonly disabled?: boolean
  readonly invalid?: boolean
  /** Controlled open flag to enable lazy querying when dialog or drawer opens. */
  readonly enabled?: boolean
}

/**
 * Reusable role multi-select popover used by both the user form drawer and the assign-roles dialog.
 */
export function UserRoleSelect({
  value,
  onChange,
  disabled = false,
  invalid = false,
  enabled = true
}: UserRoleSelectProps) {
  const idPrefix = useId()

  const roles = useQuery({
    queryKey: roleKeys.dicts(),
    queryFn: ({ signal }) => listRoleDict(signal),
    staleTime: LOOKUP_STALE_MS,
    enabled
  })

  const roleOptions = roles.data ?? []

  const selectedRoleNames = roleOptions.filter(role => value.includes(String(role.value))).map(role => role.label)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
            aria-invalid={invalid}
            disabled={disabled}
          />
        }
      >
        <span className={selectedRoleNames.length ? 'truncate' : 'truncate text-muted-foreground'}>
          {roles.isPending
            ? '加载中…'
            : roles.isError
              ? '角色加载失败'
              : selectedRoleNames.length
                ? selectedRoleNames.join('、')
                : '请选择角色'}
        </span>
        <ChevronDown className="size-4 opacity-60" />
      </PopoverTrigger>

      <PopoverContent align="start" className="max-h-60 w-64 gap-0 overflow-y-auto overscroll-contain p-1">
        {roles.isPending ? (
          <div className="flex items-center justify-center p-2">
            <Spinner />
          </div>
        ) : roles.isError ? (
          <QueryState state="error" title="角色加载失败" onRetry={() => void roles.refetch()} className="p-2" />
        ) : roleOptions.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">暂无可选角色</p>
        ) : (
          roleOptions.map(role => {
            const roleVal = String(role.value)
            const checked = value.includes(roleVal)
            const optionId = `${idPrefix}-role-${roleVal}`

            return (
              <div key={roleVal} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                <Checkbox
                  id={optionId}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={next =>
                    onChange(next ? [...value, roleVal] : value.filter(item => item !== roleVal))
                  }
                />
                <Label htmlFor={optionId} className="flex-1 cursor-pointer text-sm font-normal">
                  {role.label}
                </Label>
              </div>
            )
          })
        )}
      </PopoverContent>
    </Popover>
  )
}
