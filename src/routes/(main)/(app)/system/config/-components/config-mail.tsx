import * as React from 'react'

import { Eye, EyeOff } from 'lucide-react'
import { z } from 'zod'

import type { ProColumns } from '@/components/pro'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { usePermission } from '@/hooks/use-permission'

import { OptionSchemaForm } from './option-schema-form'
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

export function createMailColumns(optionMap: OptionMap, isEdit: boolean, showPassword: boolean, onTogglePassword: () => void) {
  return [
    {
      title: optionMap.MAIL_PROTOCOL?.name, dataIndex: 'MAIL_PROTOCOL',
      formItemProps: { rules: schema.shape.MAIL_PROTOCOL, description: optionMap.MAIL_PROTOCOL?.description },
      formItemRender: (_, control) => <Input id={control.id} value={String(control.value ?? '').toUpperCase()} disabled />
    },
    {
      title: optionMap.MAIL_HOST?.name, dataIndex: 'MAIL_HOST',
      fieldProps: { placeholder: '请输入邮件服务器地址', disabled: !isEdit },
      formItemProps: { rules: schema.shape.MAIL_HOST, description: optionMap.MAIL_HOST?.description }
    },
    {
      title: optionMap.MAIL_PORT?.name, dataIndex: 'MAIL_PORT',
      fieldProps: { placeholder: '请输入服务器端口', type: 'number', min: 0, disabled: !isEdit },
      formItemProps: { rules: schema.shape.MAIL_PORT, description: optionMap.MAIL_PORT?.description }
    },
    {
      title: optionMap.MAIL_USERNAME?.name, dataIndex: 'MAIL_USERNAME',
      fieldProps: { placeholder: '请输入发件人邮箱地址', disabled: !isEdit },
      formItemProps: { rules: schema.shape.MAIL_USERNAME, description: optionMap.MAIL_USERNAME?.description }
    },
    {
      title: optionMap.MAIL_PASSWORD?.name, dataIndex: 'MAIL_PASSWORD', valueType: 'password',
      formItemProps: { rules: schema.shape.MAIL_PASSWORD, description: optionMap.MAIL_PASSWORD?.description },
      formItemRender: (_, control) => (
        <InputGroup>
          <InputGroupInput id={control.id} value={String(control.value ?? '')}
            type={isEdit && showPassword ? 'text' : 'password'} placeholder="请输入邮箱授权码"
            onChange={event => control.onChange(event.target.value)} onBlur={control.onBlur}
            aria-invalid={control.invalid} disabled={!isEdit || control.disabled} />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="button" size="icon-xs" onClick={onTogglePassword} tabIndex={-1}
              disabled={!isEdit || control.disabled} aria-label={showPassword ? '隐藏密码' : '显示密码'}>
              {showPassword ? <EyeOff /> : <Eye />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      )
    },
    {
      valueType: 'dependency', name: ['MAIL_SSL_ENABLED'],
      columns: values => values.MAIL_SSL_ENABLED === 1 ? [{
        title: optionMap.MAIL_SSL_PORT?.name, dataIndex: 'MAIL_SSL_PORT',
        fieldProps: { placeholder: '请输入 SSL 服务器端口', type: 'number', min: 0, disabled: !isEdit },
        formItemProps: { rules: schema.shape.MAIL_SSL_PORT, description: optionMap.MAIL_SSL_PORT?.description }
      }] : []
    },
    {
      title: optionMap.MAIL_SSL_ENABLED?.name, dataIndex: 'MAIL_SSL_ENABLED', valueType: 'switch',
      fieldProps: { checkedValue: 1, uncheckedValue: 0, disabled: !isEdit },
      formItemProps: { rules: schema.shape.MAIL_SSL_ENABLED, required: false, description: optionMap.MAIL_SSL_ENABLED?.description, className: 'sm:col-span-2' }
    }
  ] satisfies ProColumns<MailFormState>[]
}

export function ConfigMail() {
  const { hasPermission } = usePermission()
  const options = useOptionForm({ category: 'MAIL', toForm })
  const [showPassword, setShowPassword] = React.useState(false)
  return (
    <OptionSchemaForm
      options={{ ...options, startEdit: () => { setShowPassword(false); options.startEdit() } }}
      columns={createMailColumns(options.optionMap, options.isEdit, showPassword, () => setShowPassword(value => !value))}
      title="邮件服务配置"
      description="配置系统用于发送通知、验证码及报警邮件的 SMTP 邮箱服务"
      resetDescription="确认恢复邮件配置为系统默认值吗？该操作不可撤销。"
      canUpdate={hasPermission('system:mailConfig:update')}
      className="gap-6"
      skeletonFields={4}
    />
  )
}
