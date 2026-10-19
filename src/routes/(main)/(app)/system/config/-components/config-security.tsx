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
import { InputGroupText } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { usePermission } from '@/hooks/use-permission'

import { ConfigPanelError, ConfigPanelSkeleton } from './config-panel-states'
import { TextField } from './text-field'
import { type OptionMap, useOptionForm } from './use-option-form'

const ranged = (label: string, min: number, max: number, unit: string) =>
  z.string().superRefine((value, ctx) => {
    const text = value.trim()
    if (!text) {
      ctx.addIssue({ code: 'custom', message: `请输入${label}` })
      return
    }
    if (!/^\d+$/.test(text)) {
      ctx.addIssue({ code: 'custom', message: `${label}只能包含数字` })
      return
    }
    const parsed = Number(text)
    if (parsed < min || parsed > max) {
      ctx.addIssue({ code: 'custom', message: `${label}应在 ${min}-${max} ${unit}之间` })
    }
  })

const fields = z.object({
  PASSWORD_ERROR_LOCK_COUNT: ranged('密码错误锁定阈值', 0, 10, '次'),
  PASSWORD_ERROR_LOCK_MINUTES: ranged('账号锁定时长', 1, 1440, '分钟'),
  PASSWORD_EXPIRATION_DAYS: ranged('密码有效期', 0, 999, '天'),
  PASSWORD_EXPIRATION_WARNING_DAYS: ranged('密码到期提醒', 0, 998, '天'),
  PASSWORD_REPETITION_TIMES: ranged('历史密码重复校验次数', 3, 32, '次'),
  PASSWORD_MIN_LENGTH: ranged('密码最小长度', 8, 32, '个字符'),
  PASSWORD_ALLOW_CONTAIN_USERNAME: z.number().int().min(0).max(1),
  PASSWORD_REQUIRE_SYMBOLS: z.number().int().min(0).max(1)
})

const schema = fields.refine(
  value => {
    const days = Number(value.PASSWORD_EXPIRATION_DAYS)
    const warning = Number(value.PASSWORD_EXPIRATION_WARNING_DAYS)
    return !days || warning < days
  },
  { message: '密码到期提醒时间应小于密码有效期', path: ['PASSWORD_EXPIRATION_WARNING_DAYS'] }
)

type SecurityFormState = z.infer<typeof fields>

function toForm(optionMap: OptionMap): SecurityFormState {
  return {
    PASSWORD_ERROR_LOCK_COUNT: optionMap.PASSWORD_ERROR_LOCK_COUNT?.value || '5',
    PASSWORD_ERROR_LOCK_MINUTES: optionMap.PASSWORD_ERROR_LOCK_MINUTES?.value || '5',
    PASSWORD_EXPIRATION_DAYS: optionMap.PASSWORD_EXPIRATION_DAYS?.value || '0',
    PASSWORD_EXPIRATION_WARNING_DAYS: optionMap.PASSWORD_EXPIRATION_WARNING_DAYS?.value || '0',
    PASSWORD_REPETITION_TIMES: optionMap.PASSWORD_REPETITION_TIMES?.value || '3',
    PASSWORD_MIN_LENGTH: optionMap.PASSWORD_MIN_LENGTH?.value || '8',
    PASSWORD_ALLOW_CONTAIN_USERNAME: Number.parseInt(optionMap.PASSWORD_ALLOW_CONTAIN_USERNAME?.value || '1', 10),
    PASSWORD_REQUIRE_SYMBOLS: Number.parseInt(optionMap.PASSWORD_REQUIRE_SYMBOLS?.value || '0', 10)
  }
}

const isRequired = (field: keyof SecurityFormState) => !fields.shape[field].safeParse('').success

export function ConfigSecurity() {
  const { hasPermission } = usePermission()
  const canUpdate = hasPermission('system:securityConfig:update')

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
  } = useOptionForm({ category: 'PASSWORD', toForm, schema })

  if (isLoading) {
    return <ConfigPanelSkeleton fields={6} />
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
          <h2 className="font-heading text-base font-semibold tracking-tight">安全策略配置</h2>
          <p className="text-sm text-muted-foreground">配置密码复杂度、重试锁定与密码过期提醒策略</p>
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

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
          <form.Field
            name="PASSWORD_ERROR_LOCK_COUNT"
            validators={{ onSubmit: fields.shape.PASSWORD_ERROR_LOCK_COUNT }}
          >
            {field => (
              <TextField
                field={field}
                label={optionMap.PASSWORD_ERROR_LOCK_COUNT?.name}
                description={optionMap.PASSWORD_ERROR_LOCK_COUNT?.description}
                type="number"
                min={0}
                max={10}
                required={isRequired('PASSWORD_ERROR_LOCK_COUNT')}
                disabled={!isEdit}
                addonEnd={<InputGroupText className="text-xs font-normal">次</InputGroupText>}
              />
            )}
          </form.Field>

          <form.Field
            name="PASSWORD_ERROR_LOCK_MINUTES"
            validators={{ onSubmit: fields.shape.PASSWORD_ERROR_LOCK_MINUTES }}
          >
            {field => (
              <TextField
                field={field}
                label={optionMap.PASSWORD_ERROR_LOCK_MINUTES?.name}
                description={optionMap.PASSWORD_ERROR_LOCK_MINUTES?.description}
                type="number"
                min={1}
                max={1440}
                required={isRequired('PASSWORD_ERROR_LOCK_MINUTES')}
                disabled={!isEdit}
                addonEnd={<InputGroupText className="text-xs font-normal">分钟</InputGroupText>}
              />
            )}
          </form.Field>

          <form.Field name="PASSWORD_EXPIRATION_DAYS" validators={{ onSubmit: fields.shape.PASSWORD_EXPIRATION_DAYS }}>
            {field => (
              <TextField
                field={field}
                label={optionMap.PASSWORD_EXPIRATION_DAYS?.name}
                description={optionMap.PASSWORD_EXPIRATION_DAYS?.description}
                type="number"
                min={0}
                max={999}
                required={isRequired('PASSWORD_EXPIRATION_DAYS')}
                disabled={!isEdit}
                addonEnd={<InputGroupText className="text-xs font-normal">天</InputGroupText>}
              />
            )}
          </form.Field>

          <form.Field
            name="PASSWORD_EXPIRATION_WARNING_DAYS"
            validators={{ onSubmit: fields.shape.PASSWORD_EXPIRATION_WARNING_DAYS }}
          >
            {field => (
              <TextField
                field={field}
                label={optionMap.PASSWORD_EXPIRATION_WARNING_DAYS?.name}
                description={optionMap.PASSWORD_EXPIRATION_WARNING_DAYS?.description}
                type="number"
                min={0}
                max={998}
                required={isRequired('PASSWORD_EXPIRATION_WARNING_DAYS')}
                disabled={!isEdit}
                addonEnd={<InputGroupText className="text-xs font-normal">天</InputGroupText>}
              />
            )}
          </form.Field>

          <form.Field
            name="PASSWORD_REPETITION_TIMES"
            validators={{ onSubmit: fields.shape.PASSWORD_REPETITION_TIMES }}
          >
            {field => (
              <TextField
                field={field}
                label={optionMap.PASSWORD_REPETITION_TIMES?.name}
                description={optionMap.PASSWORD_REPETITION_TIMES?.description}
                type="number"
                min={3}
                max={32}
                required={isRequired('PASSWORD_REPETITION_TIMES')}
                disabled={!isEdit}
                addonEnd={<InputGroupText className="text-xs font-normal">次</InputGroupText>}
              />
            )}
          </form.Field>

          <form.Field name="PASSWORD_MIN_LENGTH" validators={{ onSubmit: fields.shape.PASSWORD_MIN_LENGTH }}>
            {field => (
              <TextField
                field={field}
                label={optionMap.PASSWORD_MIN_LENGTH?.name}
                description={optionMap.PASSWORD_MIN_LENGTH?.description}
                type="number"
                min={8}
                max={32}
                required={isRequired('PASSWORD_MIN_LENGTH')}
                disabled={!isEdit}
              />
            )}
          </form.Field>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2">
          <form.Field
            name="PASSWORD_ALLOW_CONTAIN_USERNAME"
            validators={{ onSubmit: fields.shape.PASSWORD_ALLOW_CONTAIN_USERNAME }}
          >
            {field => (
              <Field orientation="horizontal" className="items-center justify-between">
                <FieldContent>
                  <FieldLabel className="text-left font-medium">
                    {optionMap.PASSWORD_ALLOW_CONTAIN_USERNAME?.name}
                  </FieldLabel>
                  <FieldDescription>{optionMap.PASSWORD_ALLOW_CONTAIN_USERNAME?.description}</FieldDescription>
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

          <form.Field name="PASSWORD_REQUIRE_SYMBOLS" validators={{ onSubmit: fields.shape.PASSWORD_REQUIRE_SYMBOLS }}>
            {field => (
              <Field orientation="horizontal" className="items-center justify-between">
                <FieldContent>
                  <FieldLabel className="text-left font-medium">{optionMap.PASSWORD_REQUIRE_SYMBOLS?.name}</FieldLabel>
                  <FieldDescription>{optionMap.PASSWORD_REQUIRE_SYMBOLS?.description}</FieldDescription>
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
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复默认</AlertDialogTitle>
            <AlertDialogDescription>确认恢复安全配置为系统默认值吗？该操作不可撤销。</AlertDialogDescription>
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
