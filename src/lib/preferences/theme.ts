export const THEME_MODE_VALUES = ['light', 'dark', 'system'] as const

export type ThemeMode = (typeof THEME_MODE_VALUES)[number]
export type ResolvedThemeMode = 'light' | 'dark'

export const THEME_COLOR_OPTIONS = [
  {
    value: 'default',
    label: 'Default',
    primary: { light: 'oklch(0.205 0 0)', dark: 'oklch(0.922 0 0)' }
  },
  {
    value: 'blue',
    label: 'Blue',
    primary: { light: 'oklch(0.546 0.245 262.881)', dark: 'oklch(0.707 0.165 254.624)' }
  },
  {
    value: 'cyan',
    label: 'Cyan',
    primary: { light: 'oklch(0.609 0.126 221.723)', dark: 'oklch(0.789 0.154 211.530)' }
  },
  {
    value: 'teal',
    label: 'Teal',
    primary: { light: 'oklch(0.600 0.118 184.704)', dark: 'oklch(0.777 0.152 181.912)' }
  },
  {
    value: 'emerald',
    label: 'Emerald',
    primary: { light: 'oklch(0.596 0.145 163.225)', dark: 'oklch(0.765 0.177 163.223)' }
  },
  {
    value: 'amber',
    label: 'Amber',
    primary: { light: 'oklch(0.666 0.179 58.318)', dark: 'oklch(0.828 0.189 84.429)' }
  },
  {
    value: 'orange',
    label: 'Orange',
    primary: { light: 'oklch(0.646 0.222 41.116)', dark: 'oklch(0.750 0.183 55.934)' }
  },
  {
    value: 'rose',
    label: 'Rose',
    primary: { light: 'oklch(0.586 0.253 17.585)', dark: 'oklch(0.712 0.194 13.428)' }
  },
  {
    value: 'fuchsia',
    label: 'Fuchsia',
    primary: { light: 'oklch(0.591 0.293 322.896)', dark: 'oklch(0.740 0.238 322.160)' }
  },
  {
    value: 'violet',
    label: 'Violet',
    primary: { light: 'oklch(0.541 0.281 293.009)', dark: 'oklch(0.702 0.183 293.541)' }
  },
] as const

export const THEME_COLOR_VALUES = THEME_COLOR_OPTIONS.map(color => color.value)

export type ThemeColor = (typeof THEME_COLOR_OPTIONS)[number]['value']
