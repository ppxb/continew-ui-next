import * as React from 'react'
import type { ColumnOrderState, ColumnPinningState, ColumnVisibilityState } from '@tanstack/react-table'

import { getLocalStorageJson, removeLocalStorageValue, setLocalStorageJson } from '@/lib/local-storage'

/** The column layout a user can change in the column settings: order, visibility and pinning. */
export interface ColumnsSetting {
  readonly columnOrder: ColumnOrderState
  readonly columnVisibility: ColumnVisibilityState
  readonly columnPinning: ColumnPinningState
}

interface StoredColumnsSetting {
  readonly version: 1
  /** Every column id at save time, so columns added later keep their configured defaults. */
  readonly columnOrder: string[]
  readonly hidden: string[]
  readonly start: string[]
  readonly end: string[]
}

/**
 * `localStorage` key of a table's saved columns, after ContiNew Admin's
 * `table-columns-settings-:system:user`: the route template (`/system/user/$id`, never the
 * concrete URL, so params and the deploy base stay out of it), plus `tableId` for a route that
 * shows more than one table.
 */
export function columnsStorageKey(routePath: string, tableId?: string) {
  const path = routePath.length > 1 ? routePath.replace(/\/$/, '') : routePath
  const key = `table-columns-settings-${path.replaceAll('/', ':')}`
  return tableId ? `${key}:${tableId}` : key
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function parseStored(value: unknown): StoredColumnsSetting | null {
  if (!value || typeof value !== 'object') return null
  const stored = value as Partial<StoredColumnsSetting>
  if (
    stored.version !== 1 ||
    !isStringArray(stored.columnOrder) ||
    !isStringArray(stored.hidden) ||
    !isStringArray(stored.start) ||
    !isStringArray(stored.end)
  )
    return null
  return stored as StoredColumnsSetting
}

function toStored(setting: ColumnsSetting): StoredColumnsSetting {
  return {
    version: 1,
    columnOrder: [...setting.columnOrder],
    hidden: Object.keys(setting.columnVisibility).filter(id => setting.columnVisibility[id] === false),
    start: [...setting.columnPinning.start],
    end: [...setting.columnPinning.end]
  }
}

/**
 * Applies a saved layout to the current columns. Saved ids that no longer exist are dropped;
 * columns the save did not know keep their default visibility and pinning, and slot in after the
 * column that precedes them by default. `alwaysVisible` columns can never end up hidden.
 */
export function mergeColumnsSetting(
  defaults: ColumnsSetting,
  stored: unknown,
  alwaysVisible: ReadonlySet<string> = new Set()
): ColumnsSetting {
  const saved = parseStored(stored)
  if (!saved) return defaults

  const ids = defaults.columnOrder
  const known = new Set(ids)
  const savedIds = new Set(saved.columnOrder)

  const columnOrder = saved.columnOrder.filter(id => known.has(id))
  ids.forEach((id, index) => {
    if (savedIds.has(id)) return
    // Slot a new column in after the nearest default predecessor already placed.
    let at = 0
    for (let i = index - 1; i >= 0; i--) {
      const placed = columnOrder.indexOf(ids[i])
      if (placed !== -1) {
        at = placed + 1
        break
      }
    }
    columnOrder.splice(at, 0, id)
  })

  const columnVisibility: ColumnVisibilityState = {}
  for (const id of ids) {
    const hidden = savedIds.has(id) ? saved.hidden.includes(id) : defaults.columnVisibility[id] === false
    if (hidden && !alwaysVisible.has(id)) columnVisibility[id] = false
  }

  const start = [
    ...saved.start.filter(id => known.has(id)),
    ...defaults.columnPinning.start.filter(id => !savedIds.has(id))
  ]
  const end = [...saved.end.filter(id => known.has(id)), ...defaults.columnPinning.end.filter(id => !savedIds.has(id))]

  return { columnOrder, columnVisibility, columnPinning: { start, end } }
}

// Development checks for tables sharing a storage entry: mounted keys catch two tables on screen at
// once, and the column ids seen per key catch tables that take turns (tabs) without a `tableId`.
const mountedKeys = new Map<string, number>()
const columnsByKey = new Map<string, string>()
const SHARED_KEY_HINT = '请通过 tableId 为每个表格指定唯一 id'

/**
 * The column layout of one table. Changes apply at once and last while the table is mounted;
 * `save` writes the current layout to `localStorage` under `storageKey`, and `reset` drops the
 * saved entry and returns to the defaults. Without a key nothing is read or written.
 */
export function useColumnsSetting(
  defaults: ColumnsSetting,
  storageKey: string | undefined,
  alwaysVisible: ReadonlySet<string>
) {
  const read = (key: string | undefined) => ({
    key,
    value: key ? getLocalStorageJson<unknown>(key) : null
  })
  const [state, setState] = React.useState(() => read(storageKey))
  // A mounted table whose key changes (one component reused per tab) reads the other entry.
  let current = state
  if (state.key !== storageKey) {
    current = read(storageKey)
    setState(current)
  }

  const setting = React.useMemo(
    () => mergeColumnsSetting(defaults, current.value, alwaysVisible),
    [defaults, current.value, alwaysVisible]
  )

  const columnIds = defaults.columnOrder.join(',')
  // The key this table last registered, so its own columns changing (permissions loading) is no clash.
  const registeredKey = React.useRef<string>(undefined)
  React.useEffect(() => {
    if (!storageKey || !import.meta.env.DEV) return
    const seen = columnsByKey.get(storageKey)
    if (registeredKey.current !== storageKey && seen !== undefined && seen !== columnIds)
      console.warn(`[ProTable] 列不同的表格共用列设置 "${storageKey}"，${SHARED_KEY_HINT}`)
    registeredKey.current = storageKey
    columnsByKey.set(storageKey, columnIds)
    const count = (mountedKeys.get(storageKey) ?? 0) + 1
    mountedKeys.set(storageKey, count)
    if (count > 1) console.warn(`[ProTable] 多个表格同时共用列设置 "${storageKey}"，${SHARED_KEY_HINT}`)
    return () => {
      const remaining = (mountedKeys.get(storageKey) ?? 1) - 1
      if (remaining > 0) mountedKeys.set(storageKey, remaining)
      else mountedKeys.delete(storageKey)
    }
  }, [storageKey, columnIds])

  const change = (next: ColumnsSetting) => setState({ key: storageKey, value: toStored(next) })
  const save = () => {
    if (storageKey) setLocalStorageJson(storageKey, toStored(setting))
  }
  const reset = () => {
    if (storageKey) removeLocalStorageValue(storageKey)
    setState({ key: storageKey, value: null })
  }

  return { setting, change, save, reset }
}
