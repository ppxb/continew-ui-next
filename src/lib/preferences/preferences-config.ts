/**
 * How each preference is saved.
 *
 * "client-cookie"  → written in the browser and read by the boot script before the first paint.
 * "server-cookie"  → legacy value from the SSR era, treated as a client cookie.
 * "localStorage"   → client only (non-layout stuff).
 * "none"           → no saving, resets on reload.
 */

import { fontKeys } from '../fonts/registry'

import {
  CONTENT_LAYOUT_VALUES,
  NAVBAR_STYLE_VALUES,
  SIDEBAR_COLLAPSIBLE_VALUES,
  SIDEBAR_VARIANT_VALUES
} from './layout'
import { THEME_MODE_VALUES, THEME_PRESET_VALUES } from './theme'

export type PreferencePersistence = 'none' | 'client-cookie' | 'server-cookie' | 'localStorage'

type LayoutPersistence = Exclude<PreferencePersistence, 'localStorage'>

type PreferenceDefinition<
  Values extends readonly string[],
  Persistence extends PreferencePersistence,
  Attribute extends `data-${string}`
> = {
  values: Values
  defaultValue: Values[number]
  persistence: Persistence
  attribute: Attribute
}

function definePreference<
  const Values extends readonly string[],
  const Persistence extends PreferencePersistence,
  const Attribute extends `data-${string}`
>(definition: PreferenceDefinition<Values, Persistence, Attribute>) {
  return definition
}

function defineSSRPreference<
  const Values extends readonly string[],
  const Persistence extends LayoutPersistence,
  const Attribute extends `data-${string}`
>(definition: PreferenceDefinition<Values, Persistence, Attribute>) {
  return definition
}

export const PREFERENCE_REGISTRY = {
  theme_mode: definePreference({
    values: THEME_MODE_VALUES,
    defaultValue: 'light',
    persistence: 'client-cookie',
    attribute: 'data-theme-mode'
  }),

  theme_preset: definePreference({
    values: THEME_PRESET_VALUES,
    defaultValue: 'default',
    persistence: 'client-cookie',
    attribute: 'data-theme-preset'
  }),

  font: definePreference({
    values: fontKeys,
    defaultValue: 'geist',
    persistence: 'client-cookie',
    attribute: 'data-font'
  }),

  content_layout: definePreference({
    values: CONTENT_LAYOUT_VALUES,
    defaultValue: 'centered',
    persistence: 'client-cookie',
    attribute: 'data-content-layout'
  }),

  navbar_style: definePreference({
    values: NAVBAR_STYLE_VALUES,
    defaultValue: 'sticky',
    persistence: 'client-cookie',
    attribute: 'data-navbar-style'
  }),

  sidebar_variant: defineSSRPreference({
    values: SIDEBAR_VARIANT_VALUES,
    defaultValue: 'sidebar',
    persistence: 'client-cookie',
    attribute: 'data-sidebar-variant'
  }),

  sidebar_collapsible: defineSSRPreference({
    values: SIDEBAR_COLLAPSIBLE_VALUES,
    defaultValue: 'icon',
    persistence: 'client-cookie',
    attribute: 'data-sidebar-collapsible'
  })
} as const

export type PreferenceKey = keyof typeof PREFERENCE_REGISTRY

export type PreferenceValueMap = {
  [K in PreferenceKey]: (typeof PREFERENCE_REGISTRY)[K]['values'][number]
}

export const PREFERENCE_KEYS = Object.freeze(Object.keys(PREFERENCE_REGISTRY) as PreferenceKey[])

export function getPreferencePersistence(key: PreferenceKey): PreferencePersistence {
  return PREFERENCE_REGISTRY[key].persistence
}

export const PREFERENCE_DEFAULTS = Object.fromEntries(
  PREFERENCE_KEYS.map(key => [key, PREFERENCE_REGISTRY[key].defaultValue])
) as PreferenceValueMap

export function parsePreference<K extends PreferenceKey>(
  key: K,
  rawValue: string | null | undefined
): PreferenceValueMap[K] {
  const definition = PREFERENCE_REGISTRY[key]
  const allowedValues = definition.values as readonly string[]

  if (rawValue && allowedValues.includes(rawValue)) {
    return rawValue as PreferenceValueMap[K]
  }

  return definition.defaultValue as PreferenceValueMap[K]
}
