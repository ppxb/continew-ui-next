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
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { usePermission } from '@/hooks/use-permission'

import { ConfigPanelError, ConfigPanelSkeleton } from './config-panel-states'
import { type OptionMap, useOptionForm } from './use-option-form'

interface LoginFormState {
  LOGIN_CAPTCHA_ENABLED: number
}

/** Maps the LOGIN options to the form state; the fallback doubles as the initial value. */
function toForm(optionMap: OptionMap): LoginFormState {
  return {
    LOGIN_CAPTCHA_ENABLED: Number.parseInt(optionMap.LOGIN_CAPTCHA_ENABLED?.value || '1', 10)
  }
}

export function ConfigLogin() {
  const { hasPermission } = usePermission()
  const canUpdate = hasPermission('system:loginConfig:update')

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
  } = useOptionForm({ category: 'LOGIN', toForm })

  if (isLoading) {
    return <ConfigPanelSkeleton fields={1} />
  }

  if (isError) {
    return <ConfigPanelError onRetry={() => void refetch()} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">登录策略配置</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">配置用户认证、图形验证码与登录行为策略</p>
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
              <Button size="sm" onClick={save} disabled={isSaving}>
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

      <div className="flex flex-col gap-4 max-w-xl">
        <Field orientation="horizontal" className="items-center justify-between">
          <FieldContent>
            <FieldLabel className="text-left font-medium">
              {optionMap.LOGIN_CAPTCHA_ENABLED?.name || '是否启用验证码'}
            </FieldLabel>
            <FieldDescription>
              {optionMap.LOGIN_CAPTCHA_ENABLED?.description ||
                '开启后，用户在后台登录时需要输入图形验证码以防止暴力破解'}
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={form.LOGIN_CAPTCHA_ENABLED === 1}
            onCheckedChange={checked => setForm(prev => ({ ...prev, LOGIN_CAPTCHA_ENABLED: checked ? 1 : 0 }))}
            disabled={!isEdit}
          />
        </Field>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复默认</AlertDialogTitle>
            <AlertDialogDescription>确认恢复登录配置为系统默认值吗？该操作不可撤销。</AlertDialogDescription>
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
