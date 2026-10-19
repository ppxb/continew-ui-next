import * as React from 'react'

import { Check, Eye, EyeOff, Pencil, RefreshCw, RotateCcw, Undo2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { InputGroupButton } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { usePermission } from '@/hooks/use-permission'

import { ConfigPanelError, ConfigPanelSkeleton } from './config-panel-states'
import { RequiredMark } from './required-mark'
import { TextField } from './text-field'
import { type OptionMap, useOptionForm } from './use-option-form'

const nonBlank = (message: string) => z.string().trim().min(1, message)

const port = (emptyMessage: string, invalidMessage: string) =>
  z.string().superRefine((value, ctx) => {
    const text = value.trim()
    if (!text) {
      ctx.addIssue({ code: 'custom', message: emptyMessage })
      return
    }
    if (!/^\d+$/.test(text)) {
      ctx.addIssue({ code: 'custom', message: invalidMessage })
    }
  })

const schema = z.object({
  MAIL_PROTOCOL: z.string(),
  MAIL_HOST: nonBlank('请输入邮件服务器地址'),
  MAIL_PORT: port('请输入服务器端口', '服务器端口只能包含数字'),
  MAIL_USERNAME: nonBlank('请输入发件人邮箱地址'),
  MAIL_PASSWORD: nonBlank('请输入邮箱服务密码或授权码'),
  MAIL_SSL_ENABLED: z.number().int().min(0).max(1),
  MAIL_SSL_PORT: port('请输入 SSL 端口', 'SSL 端口只能包含数字')
})

type MailFormState = z.infer<typeof schema>

function toForm(optionMap: OptionMap): MailFormState {
  return {
    MAIL_PROTOCOL: optionMap.MAIL_PROTOCOL?.value || 'smtp',
    MAIL_HOST: optionMap.MAIL_HOST?.value || '',
    MAIL_PORT: optionMap.MAIL_PORT?.value || '465',
    MAIL_USERNAME: optionMap.MAIL_USERNAME?.value || '',
    MAIL_PASSWORD: optionMap.MAIL_PASSWORD?.value || '',
    MAIL_SSL_ENABLED: Number.parseInt(optionMap.MAIL_SSL_ENABLED?.value || '1', 10),
    MAIL_SSL_PORT: optionMap.MAIL_SSL_PORT?.value || '465'
  }
}

const isRequired = (field: keyof MailFormState) => !schema.shape[field].safeParse('').success

export function ConfigMail() {
  const { hasPermission } = usePermission()
  const canUpdate = hasPermission('system:mailConfig:update')

  const [showPassword, setShowPassword] = React.useState(false)

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
    resetToDefault,
    isResetting,
    resetDialogOpen,
    setResetDialogOpen
  } = useOptionForm({ category: 'MAIL', toForm, schema })

  if (isLoading) {
    return <ConfigPanelSkeleton fields={4} />
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
        void form.handleSubmit()
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="font-heading text-base font-semibold tracking-tight">邮件服务配置</h2>
          <p className="text-sm text-muted-foreground">配置系统用于发送通知、验证码及报警邮件的 SMTP 邮箱服务</p>
        </div>
        <div className="flex items-center gap-2">
          {!isEdit ? (
            <>
              {canUpdate && (
                <Button type="button" size="sm" onClick={() => setIsEdit(true)}>
                  <Pencil />
                  修改
                </Button>
              )}
              {canUpdate && (
                <Button type="button" size="sm" variant="outline" onClick={() => setResetDialogOpen(true)}>
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
          <form.Field name="MAIL_PROTOCOL">
            {field => (
              <Field>
                <FieldContent>
                  <FieldLabel className="text-left">
                    {optionMap.MAIL_PROTOCOL?.name || '邮件协议'}
                    {isRequired('MAIL_PROTOCOL') && <RequiredMark />}
                  </FieldLabel>
                  <FieldDescription>{optionMap.MAIL_PROTOCOL?.description}</FieldDescription>
                </FieldContent>
                <Input value={field.state.value.toUpperCase()} disabled />
              </Field>
            )}
          </form.Field>

          <form.Field name="MAIL_HOST">
            {field => (
              <TextField
                field={field}
                label={optionMap.MAIL_HOST?.name}
                description={optionMap.MAIL_HOST?.description}
                placeholder="请输入邮件服务器地址"
                required={isRequired('MAIL_HOST')}
                disabled={!isEdit}
              />
            )}
          </form.Field>

          <form.Field name="MAIL_PORT">
            {field => (
              <TextField
                field={field}
                label={optionMap.MAIL_PORT?.name}
                description={optionMap.MAIL_PORT?.description}
                placeholder="请输入服务器端口"
                type="number"
                min={0}
                required={isRequired('MAIL_PORT')}
                disabled={!isEdit}
              />
            )}
          </form.Field>

          <form.Field name="MAIL_USERNAME">
            {field => (
              <TextField
                field={field}
                label={optionMap.MAIL_USERNAME?.name}
                description={optionMap.MAIL_USERNAME?.description}
                placeholder="请输入发件人邮箱地址"
                required={isRequired('MAIL_USERNAME')}
                disabled={!isEdit}
              />
            )}
          </form.Field>

          <form.Field name="MAIL_PASSWORD">
            {field => (
              <TextField
                field={field}
                label={optionMap.MAIL_PASSWORD?.name}
                description={optionMap.MAIL_PASSWORD?.description}
                placeholder="请输入邮箱授权码"
                type={showPassword ? 'text' : 'password'}
                required={isRequired('MAIL_PASSWORD')}
                disabled={!isEdit}
                addonEnd={
                  <InputGroupButton size="icon-xs" onClick={() => setShowPassword(prev => !prev)} tabIndex={-1}>
                    {showPassword ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                }
              />
            )}
          </form.Field>

          <form.Subscribe selector={state => state.values.MAIL_SSL_ENABLED === 1}>
            {sslEnabled =>
              sslEnabled && (
                <form.Field name="MAIL_SSL_PORT">
                  {field => (
                    <TextField
                      field={field}
                      label={optionMap.MAIL_SSL_PORT?.name}
                      description={optionMap.MAIL_SSL_PORT?.description}
                      placeholder="请输入 SSL 服务器端口"
                      type="number"
                      min={0}
                      required={isRequired('MAIL_SSL_PORT')}
                      disabled={!isEdit}
                    />
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>
        </div>

        <form.Field name="MAIL_SSL_ENABLED">
          {field => (
            <Field orientation="horizontal" className="items-center justify-between">
              <FieldContent>
                <FieldLabel className="text-left font-medium">{optionMap.MAIL_SSL_ENABLED?.name}</FieldLabel>
                <FieldDescription>{optionMap.MAIL_SSL_ENABLED?.description}</FieldDescription>
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
            <AlertDialogDescription>确认恢复邮件配置为系统默认值吗？该操作不可撤销。</AlertDialogDescription>
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
