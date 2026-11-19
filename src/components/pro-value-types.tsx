import { DeptTreeSelect } from '@/components/dept-tree-select'
import { ExpiryPicker } from '@/components/expiry-picker'
import type { ProValueTypeMap } from '@/components/pro/typing'

declare module '@/components/pro/typing' {
  interface ProFieldValueTypeWithFieldProps {
    expiry: { neverLabel?: string; placeholder?: string; disabled?: boolean }
    deptTreeSelect: { placeholder?: string; disabled?: boolean }
  }
}

export const projectValueTypes: ProValueTypeMap = {
  expiry: {
    initialValue: '',
    render: text => <span className="tabular-nums">{String(text)}</span>,
    formItemRender: (
      _text,
      { fieldProps: { id, value, onChange, onBlur, invalid, neverLabel, placeholder, disabled } }
    ) => (
      <ExpiryPicker
        id={id}
        value={String(value ?? '')}
        onChange={next => onChange?.(next)}
        onBlur={onBlur}
        invalid={invalid}
        neverLabel={neverLabel as string | undefined}
        placeholder={placeholder as string | undefined}
        disabled={disabled as boolean | undefined}
      />
    )
  },
  deptTreeSelect: {
    initialValue: '',
    formItemRender: (_text, { light, label, fieldProps: { id, value, onChange, invalid, placeholder, disabled } }) => (
      <DeptTreeSelect
        id={id}
        value={value as string | number | null | undefined}
        onChange={next => onChange?.(light && next === '' ? undefined : next)}
        invalid={invalid}
        placeholder={placeholder as string | undefined}
        disabled={disabled as boolean | undefined}
        triggerPrefix={light ? label : undefined}
        showAllOption={light}
        allOptionLabel="全部部门"
        className={light ? 'sm:w-44' : undefined}
      />
    )
  }
}
