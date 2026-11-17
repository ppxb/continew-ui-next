import { isValidElement, type ReactNode } from 'react'

import { ToneBadge } from '@/components/tone-badge'
import type { BadgeTone } from '@/components/tone-badge'
import type { ProFieldValueEnum, ProSchemaValueEnumType, ProValue, RequestOptionsType } from '../typing'

const STATUS_TONES: Record<NonNullable<ProSchemaValueEnumType['status']>, BadgeTone> = {
  Success: 'success', Error: 'danger', Processing: 'info', Warning: 'warning', Default: 'neutral'
}

export function isEnumItem(value: ProSchemaValueEnumType | ReactNode): value is ProSchemaValueEnumType {
  return typeof value === 'object' && value !== null && !isValidElement(value) && 'text' in value
}

export function valueEnumToOptions(valueEnum: ProFieldValueEnum | undefined): RequestOptionsType[] {
  if (!valueEnum) return []
  const entries: Iterable<[ProValue, ProSchemaValueEnumType | ReactNode]> = valueEnum instanceof Map
    ? valueEnum.entries() : Object.entries(valueEnum)
  return Array.from(entries, ([value, item]) => isEnumItem(item)
    ? { value, label: item.text, disabled: item.disabled, status: item.status, color: item.color }
    : { value, label: item })
}

export function renderEnumValue(value: unknown, valueEnum: ProFieldValueEnum | undefined, options?: readonly RequestOptionsType[]): ReactNode {
  if (Array.isArray(value)) return value.map((item, index) => (
    <span key={index}>{index > 0 ? '、' : null}{renderEnumValue(item, valueEnum, options)}</span>
  ))
  const item = valueEnum instanceof Map
    ? (valueEnum.get(value as ProValue) ?? valueEnum.get(String(value)))
    : valueEnum?.[String(value)]
  const option = item === undefined ? options?.find(entry => entry.value === value || String(entry.value) === String(value)) : undefined
  if (isEnumItem(item)) return renderOption({ value: value as ProValue, label: item.text, status: item.status, color: item.color })
  return item !== undefined ? item : option ? renderOption(option) : String(value)
}

function renderOption(option: RequestOptionsType) {
  if (option.status) return <ToneBadge tone={STATUS_TONES[option.status]} label={option.label} />
  if (option.color) {
    const kind = ['blue', 'violet', 'teal', 'amber'].includes(option.color) ? 'type' : 'status'
    return <ToneBadge tone={option.color} kind={kind} label={option.label} />
  }
  return option.label
}
