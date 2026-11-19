import { z } from 'zod'

import type { ProColumns } from '@/components/pro'
import { usePermission } from '@/hooks/use-permission'

import { OptionSchemaForm } from './option-schema-form'
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

export function createLoginColumns(optionMap: OptionMap, isEdit: boolean) {
  return [
    {
      title: optionMap.LOGIN_CAPTCHA_ENABLED?.name,
      dataIndex: 'LOGIN_CAPTCHA_ENABLED',
      valueType: 'switch',
      fieldProps: { checkedValue: 1, uncheckedValue: 0, disabled: !isEdit },
      formItemProps: {
        className: 'max-w-xl',
        rules: schema.shape.LOGIN_CAPTCHA_ENABLED,
        required: false,
        description: '开启后，用户在后台登录时需要输入图形验证码以防止暴力破解'
      }
    }
  ] satisfies ProColumns<LoginFormState>[]
}

export function ConfigLogin() {
  const { hasPermission } = usePermission()
  const options = useOptionForm({ category: 'LOGIN', toForm })
  return (
    <OptionSchemaForm
      options={options}
      columns={createLoginColumns(options.optionMap, options.isEdit)}
      title="登录配置"
      description="配置图形验证码与登录行为策略"
      resetDescription="确认恢复登录配置为系统默认值吗？该操作不可撤销。"
      canUpdate={hasPermission('system:loginConfig:update')}
      grid={false}
      className="gap-6"
      skeletonFields={1}
    />
  )
}
