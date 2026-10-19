import { Check, Pencil, RefreshCw, RotateCcw, Undo2 } from 'lucide-react'
import { z } from 'zod'

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
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { usePermission } from '@/hooks/use-permission'

import { ConfigPanelError, ConfigPanelSkeleton } from './config-panel-states'
import { type OptionMap, useOptionForm } from './use-option-form'

const schema = z.object({
  LOGIN_CAPTCHA_ENABLED: z.number().int().min(0).max(1)
})

type LoginFormState = z.infer<typeof schema>

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
    optionMap,
    isLoading,
    isError,
    refetch,
    isEdit,
    setIsEdit,
    cancelEdit,
    resetForm,
    submit,
    resetToDefault,
    isResetting,
    resetDialogOpen,
    setResetDialogOpen
  } = useOptionForm({ category: 'LOGIN', toForm, schema })

  if (isLoading) {
    return <ConfigPanelSkeleton fields={1} />
  }

  if (isError) {
    return <ConfigPanelError onRetry={() => void refetch()} />
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={event => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">登录配置</h2>
          <p className="text-sm text-muted-foreground">配置图形验证码与登录行为策略</p>
        </div>
        <div className="flex items-center gap-2">
          {!isEdit ? (
            <>
              {canUpdate && (
                <Button size="sm" onClick={() => setIsEdit(true)}>
                  <Pencil />
                  修改
                </Button>
              )}
              {canUpdate && (
                <Button size="sm" variant="outline" onClick={() => setResetDialogOpen(true)}>
                  <RotateCcw />
                  恢复默认
                </Button>
              )}
            </>
          ) : (
            <form.Subscribe selector={state => state.isSubmitting}>
              {isSubmitting => (
                <>
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? <Spinner /> : <Check />}
                    保存
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                    <RefreshCw />
                    重置
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} disabled={isSubmitting}>
                    <Undo2 />
                    取消
                  </Button>
                </>
              )}
            </form.Subscribe>
          )}
        </div>
      </div>

      <div className="flex max-w-xl flex-col gap-4">
        <form.Field name="LOGIN_CAPTCHA_ENABLED" validators={{ onSubmit: schema.shape.LOGIN_CAPTCHA_ENABLED }}>
          {field => (
            <Field orientation="horizontal" data-invalid={field.state.meta.errors.length > 0}>
              <FieldContent>
                <FieldLabel>{optionMap.LOGIN_CAPTCHA_ENABLED?.name}</FieldLabel>
                <FieldDescription>开启后，用户在后台登录时需要输入图形验证码以防止暴力破解</FieldDescription>
                <FieldError errors={field.state.meta.errors} />
              </FieldContent>
              <Switch
                checked={field.state.value === 1}
                onCheckedChange={checked => field.handleChange(checked ? 1 : 0)}
                onBlur={field.handleBlur}
                disabled={!isEdit}
              />
            </Field>
          )}
        </form.Field>
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复默认</AlertDialogTitle>
            <AlertDialogDescription>确认恢复登录配置为系统默认值吗？该操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={resetToDefault} disabled={isResetting}>
              {isResetting ? <Spinner /> : null}
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
