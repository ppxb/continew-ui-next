import { z } from 'zod'

import type { ProColumns } from '@/components/pro'
import { InputGroupText } from '@/components/ui/input-group'
import { usePermission } from '@/hooks/use-permission'

import { OptionSchemaForm } from './option-schema-form'
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

type SecurityFormState = z.infer<typeof fields>

type NumberFieldName =
  | 'PASSWORD_ERROR_LOCK_COUNT'
  | 'PASSWORD_ERROR_LOCK_MINUTES'
  | 'PASSWORD_EXPIRATION_DAYS'
  | 'PASSWORD_EXPIRATION_WARNING_DAYS'
  | 'PASSWORD_REPETITION_TIMES'
  | 'PASSWORD_MIN_LENGTH'

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

export function createSecurityColumns(optionMap: OptionMap, isEdit: boolean) {
  const numberColumn = (
    name: NumberFieldName,
    min: number,
    max: number,
    unit?: string
  ): ProColumns<SecurityFormState> => ({
    title: optionMap[name]?.name,
    dataIndex: name,
    fieldProps: {
      type: 'number',
      min,
      max,
      disabled: !isEdit,
      addonEnd: unit ? <InputGroupText className="text-xs font-normal">{unit}</InputGroupText> : undefined
    },
    formItemProps: form => ({
      description: optionMap[name]?.description,
      rules:
        name === 'PASSWORD_EXPIRATION_WARNING_DAYS'
          ? fields.shape[name].refine(value => {
              const days = Number(form.getFieldValue('PASSWORD_EXPIRATION_DAYS'))
              return !days || Number(value) < days
            }, '密码到期提醒时间应小于密码有效期')
          : fields.shape[name]
    })
  })
  return [
    numberColumn('PASSWORD_ERROR_LOCK_COUNT', 0, 10, '次'),
    numberColumn('PASSWORD_ERROR_LOCK_MINUTES', 1, 1440, '分钟'),
    numberColumn('PASSWORD_EXPIRATION_DAYS', 0, 999, '天'),
    numberColumn('PASSWORD_EXPIRATION_WARNING_DAYS', 0, 998, '天'),
    numberColumn('PASSWORD_REPETITION_TIMES', 3, 32, '次'),
    numberColumn('PASSWORD_MIN_LENGTH', 8, 32),
    ...(['PASSWORD_ALLOW_CONTAIN_USERNAME', 'PASSWORD_REQUIRE_SYMBOLS'] as const).map(name => ({
      title: optionMap[name]?.name,
      dataIndex: name,
      valueType: 'switch' as const,
      fieldProps: { checkedValue: 1, uncheckedValue: 0, disabled: !isEdit },
      formItemProps: { rules: fields.shape[name], required: false, description: optionMap[name]?.description }
    }))
  ] satisfies ProColumns<SecurityFormState>[]
}

export function ConfigSecurity() {
  const { hasPermission } = usePermission()
  const options = useOptionForm({ category: 'PASSWORD', toForm })
  return (
    <OptionSchemaForm
      options={options}
      columns={createSecurityColumns(options.optionMap, options.isEdit)}
      title="安全策略配置"
      description="配置密码复杂度、重试锁定与密码过期提醒策略"
      resetDescription="确认恢复安全配置为系统默认值吗？该操作不可撤销。"
      canUpdate={hasPermission('system:securityConfig:update')}
      className="gap-6"
      skeletonFields={6}
    />
  )
}
