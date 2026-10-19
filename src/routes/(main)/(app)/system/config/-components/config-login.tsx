import { z } from 'zod'

import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { usePermission } from '@/hooks/use-permission'

import { ConfigPanelError, ConfigPanelSkeleton } from './config-panel-states'
import { ConfigPanelHeader } from './config-panel-header'
import { ConfigResetDialog } from './config-reset-dialog'
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
    isSubmitting,
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
      <ConfigPanelHeader
        title="登录配置"
        description="配置图形验证码与登录行为策略"
        canUpdate={canUpdate}
        isEdit={isEdit}
        isSubmitting={isSubmitting}
        onEdit={() => setIsEdit(true)}
        onResetDefault={() => setResetDialogOpen(true)}
        onResetForm={resetForm}
        onCancel={cancelEdit}
      />

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

      <ConfigResetDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        onConfirm={resetToDefault}
        isResetting={isResetting}
        description="确认恢复登录配置为系统默认值吗？该操作不可撤销。"
      />
    </form>
  )
}
