import { Check, Pencil, RefreshCw, RotateCcw, Undo2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { usePermission } from '@/hooks/use-permission'

import { ConfigPanelError, ConfigPanelSkeleton } from './config-panel-states'
import { type OptionMap, useOptionForm } from './use-option-form'

interface SecurityFormState {
  PASSWORD_ERROR_LOCK_COUNT: number
  PASSWORD_ERROR_LOCK_MINUTES: number
  PASSWORD_EXPIRATION_DAYS: number
  PASSWORD_EXPIRATION_WARNING_DAYS: number
  PASSWORD_REPETITION_TIMES: number
  PASSWORD_MIN_LENGTH: number
  PASSWORD_ALLOW_CONTAIN_USERNAME: number
  PASSWORD_REQUIRE_SYMBOLS: number
}

/**
 * Maps the PASSWORD options to the form state. The fallbacks are the panel's defaults, so a code
 * missing from the response keeps a sane value instead of collapsing to 0.
 */
function toForm(optionMap: OptionMap): SecurityFormState {
  return {
    PASSWORD_ERROR_LOCK_COUNT: Number.parseInt(optionMap.PASSWORD_ERROR_LOCK_COUNT?.value || '5', 10),
    PASSWORD_ERROR_LOCK_MINUTES: Number.parseInt(optionMap.PASSWORD_ERROR_LOCK_MINUTES?.value || '5', 10),
    PASSWORD_EXPIRATION_DAYS: Number.parseInt(optionMap.PASSWORD_EXPIRATION_DAYS?.value || '0', 10),
    PASSWORD_EXPIRATION_WARNING_DAYS: Number.parseInt(optionMap.PASSWORD_EXPIRATION_WARNING_DAYS?.value || '0', 10),
    PASSWORD_REPETITION_TIMES: Number.parseInt(optionMap.PASSWORD_REPETITION_TIMES?.value || '3', 10),
    PASSWORD_MIN_LENGTH: Number.parseInt(optionMap.PASSWORD_MIN_LENGTH?.value || '8', 10),
    PASSWORD_ALLOW_CONTAIN_USERNAME: Number.parseInt(optionMap.PASSWORD_ALLOW_CONTAIN_USERNAME?.value || '1', 10),
    PASSWORD_REQUIRE_SYMBOLS: Number.parseInt(optionMap.PASSWORD_REQUIRE_SYMBOLS?.value || '0', 10)
  }
}

export function ConfigSecurity() {
  const { hasPermission } = usePermission()
  const canUpdate = hasPermission('system:securityConfig:update')

  const {
    form,
    setForm,
    optionMap,
    isLoading,
    isError,
    refetch,
    isEdit,
    setIsEdit,
    cancelEdit,
    resetForm,
    save,
    isSaving,
    resetToDefault,
    isResetting,
    resetDialogOpen,
    setResetDialogOpen
  } = useOptionForm({ category: 'PASSWORD', toForm })

  const handleSave = () => {
    if (form.PASSWORD_EXPIRATION_DAYS > 0 && form.PASSWORD_EXPIRATION_WARNING_DAYS >= form.PASSWORD_EXPIRATION_DAYS) {
      toast.add({ title: '密码到期提醒时间应小于密码有效期', type: 'error' })
      return
    }
    if (form.PASSWORD_MIN_LENGTH < 8 || form.PASSWORD_MIN_LENGTH > 32) {
      toast.add({ title: '密码最小长度应在 8-32 个字符之间', type: 'error' })
      return
    }
    if (form.PASSWORD_REPETITION_TIMES < 3 || form.PASSWORD_REPETITION_TIMES > 32) {
      toast.add({ title: '历史密码重复校验次数应在 3-32 次之间', type: 'error' })
      return
    }
    save()
  }

  if (isLoading) {
    return <ConfigPanelSkeleton fields={6} />
  }

  if (isError) {
    return <ConfigPanelError onRetry={() => void refetch()} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">安全策略配置</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">配置密码复杂度、重试锁定与密码过期提醒策略</p>
        </div>
        <div className="flex items-center gap-2">
          {!isEdit ? (
            <>
              {canUpdate && (
                <Button size="sm" onClick={() => setIsEdit(true)}>
                  <Pencil className="size-4" />
                  修改
                </Button>
              )}
              {canUpdate && (
                <Button size="sm" variant="outline" onClick={() => setResetDialogOpen(true)}>
                  <RotateCcw className="size-4" />
                  恢复默认
                </Button>
              )}
            </>
          ) : (
            <>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Spinner className="size-4" /> : <Check className="size-4" />}
                保存
              </Button>
              <Button size="sm" variant="outline" onClick={resetForm} disabled={isSaving}>
                <RefreshCw className="size-4" />
                重置
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isSaving}>
                <Undo2 className="size-4" />
                取消
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Password error lock count */}
          <Field>
            <FieldContent>
              <FieldLabel className="text-left">
                {optionMap.PASSWORD_ERROR_LOCK_COUNT?.name || '密码错误锁定阈值'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>
                {optionMap.PASSWORD_ERROR_LOCK_COUNT?.description ||
                  '连续登录失败次数达到该值将锁定账号（0-10次，0表示禁用锁定）'}
              </FieldDescription>
            </FieldContent>
            <div className="relative mt-1">
              <Input
                type="number"
                min={0}
                max={10}
                value={form.PASSWORD_ERROR_LOCK_COUNT}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    PASSWORD_ERROR_LOCK_COUNT: Number.parseInt(e.target.value, 10) || 0
                  }))
                }
                disabled={!isEdit}
                className="pr-10 transition-none disabled:bg-transparent dark:disabled:bg-transparent"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                次
              </span>
            </div>
          </Field>

          {/* Password error lock minutes */}
          <Field>
            <FieldContent>
              <FieldLabel className="text-left">
                {optionMap.PASSWORD_ERROR_LOCK_MINUTES?.name || '账号锁定时长（分钟）'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>
                {optionMap.PASSWORD_ERROR_LOCK_MINUTES?.description ||
                  '账号锁定后自动解锁的时间（1-1440分钟，即24小时）'}
              </FieldDescription>
            </FieldContent>
            <div className="relative mt-1">
              <Input
                type="number"
                min={1}
                max={1440}
                value={form.PASSWORD_ERROR_LOCK_MINUTES}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    PASSWORD_ERROR_LOCK_MINUTES: Number.parseInt(e.target.value, 10) || 1
                  }))
                }
                disabled={!isEdit}
                className="pr-12 transition-none disabled:bg-transparent dark:disabled:bg-transparent"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                分钟
              </span>
            </div>
          </Field>

          {/* Password expiration days */}
          <Field>
            <FieldContent>
              <FieldLabel className="text-left">
                {optionMap.PASSWORD_EXPIRATION_DAYS?.name || '密码有效期（天）'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>
                {optionMap.PASSWORD_EXPIRATION_DAYS?.description || '密码强制修改周期（0-999天，0表示永不过期）'}
              </FieldDescription>
            </FieldContent>
            <div className="relative mt-1">
              <Input
                type="number"
                min={0}
                max={999}
                value={form.PASSWORD_EXPIRATION_DAYS}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    PASSWORD_EXPIRATION_DAYS: Number.parseInt(e.target.value, 10) || 0
                  }))
                }
                disabled={!isEdit}
                className="pr-10 transition-none disabled:bg-transparent dark:disabled:bg-transparent"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                天
              </span>
            </div>
          </Field>

          {/* Password expiration warning days */}
          <Field>
            <FieldContent>
              <FieldLabel className="text-left">
                {optionMap.PASSWORD_EXPIRATION_WARNING_DAYS?.name || '密码到期提醒（天）'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>
                {optionMap.PASSWORD_EXPIRATION_WARNING_DAYS?.description ||
                  '密码过期前的提前提醒天数（0表示不提醒，需小于密码有效期）'}
              </FieldDescription>
            </FieldContent>
            <div className="relative mt-1">
              <Input
                type="number"
                min={0}
                max={998}
                value={form.PASSWORD_EXPIRATION_WARNING_DAYS}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    PASSWORD_EXPIRATION_WARNING_DAYS: Number.parseInt(e.target.value, 10) || 0
                  }))
                }
                disabled={!isEdit}
                className="pr-10 transition-none disabled:bg-transparent dark:disabled:bg-transparent"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                天
              </span>
            </div>
          </Field>

          {/* Password repetition times */}
          <Field>
            <FieldContent>
              <FieldLabel className="text-left">
                {optionMap.PASSWORD_REPETITION_TIMES?.name || '历史密码重复校验次数'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>
                {optionMap.PASSWORD_REPETITION_TIMES?.description || '禁止使用最近 N 次的历史密码（3-32次）'}
              </FieldDescription>
            </FieldContent>
            <div className="relative mt-1">
              <Input
                type="number"
                min={3}
                max={32}
                value={form.PASSWORD_REPETITION_TIMES}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    PASSWORD_REPETITION_TIMES: Number.parseInt(e.target.value, 10) || 3
                  }))
                }
                disabled={!isEdit}
                className="pr-10 transition-none disabled:bg-transparent dark:disabled:bg-transparent"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                次
              </span>
            </div>
          </Field>

          {/* Password min length */}
          <Field>
            <FieldContent>
              <FieldLabel className="text-left">
                {optionMap.PASSWORD_MIN_LENGTH?.name || '密码最小长度'}
                <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>
                {optionMap.PASSWORD_MIN_LENGTH?.description || '密码最小字符长度要求（8-32个字符）'}
              </FieldDescription>
            </FieldContent>
            <div className="mt-1">
              <Input
                type="number"
                min={8}
                max={32}
                value={form.PASSWORD_MIN_LENGTH}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    PASSWORD_MIN_LENGTH: Number.parseInt(e.target.value, 10) || 8
                  }))
                }
                disabled={!isEdit}
                className="transition-none disabled:bg-transparent dark:disabled:bg-transparent"
              />
            </div>
          </Field>
        </div>

        {/* Switch policies */}
        <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2">
          {/* Allow contain username */}
          <Field orientation="horizontal" className="items-center justify-between">
            <FieldContent>
              <FieldLabel className="text-left font-medium">
                {optionMap.PASSWORD_ALLOW_CONTAIN_USERNAME?.name || '是否允许密码包含用户名'}
              </FieldLabel>
              <FieldDescription>
                {optionMap.PASSWORD_ALLOW_CONTAIN_USERNAME?.description || '是否允许密码包含正序或倒序的用户名字符'}
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={form.PASSWORD_ALLOW_CONTAIN_USERNAME === 1}
              onCheckedChange={checked =>
                setForm(prev => ({ ...prev, PASSWORD_ALLOW_CONTAIN_USERNAME: checked ? 1 : 0 }))
              }
              disabled={!isEdit}
            />
          </Field>

          {/* Require symbols */}
          <Field orientation="horizontal" className="items-center justify-between">
            <FieldContent>
              <FieldLabel className="text-left font-medium">
                {optionMap.PASSWORD_REQUIRE_SYMBOLS?.name || '密码是否必须包含特殊字符'}
              </FieldLabel>
              <FieldDescription>
                {optionMap.PASSWORD_REQUIRE_SYMBOLS?.description || '是否要求密码必须包含特殊字符（如：!@#$%）'}
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={form.PASSWORD_REQUIRE_SYMBOLS === 1}
              onCheckedChange={checked => setForm(prev => ({ ...prev, PASSWORD_REQUIRE_SYMBOLS: checked ? 1 : 0 }))}
              disabled={!isEdit}
            />
          </Field>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复默认</AlertDialogTitle>
            <AlertDialogDescription>确认恢复安全配置为系统默认值吗？该操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={resetToDefault} disabled={isResetting}>
              {isResetting ? <Spinner className="size-4" /> : null}
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
