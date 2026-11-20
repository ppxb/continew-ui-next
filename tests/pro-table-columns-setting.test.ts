import { describe, expect, it } from 'vitest'

import { mergeColumnsSetting, type ColumnsSetting } from '@/components/pro/table/columns-setting'

const DEFAULTS: ColumnsSetting = {
  columnOrder: ['index', 'name', 'status', 'actions'],
  columnVisibility: { status: false },
  columnPinning: { start: [], end: ['actions'] }
}

function stored(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    columnOrder: ['index', 'name', 'status', 'actions'],
    hidden: [],
    start: [],
    end: [],
    ...overrides
  }
}

describe('mergeColumnsSetting', () => {
  it('falls back to the defaults for missing or malformed saves', () => {
    expect(mergeColumnsSetting(DEFAULTS, null)).toBe(DEFAULTS)
    expect(mergeColumnsSetting(DEFAULTS, { version: 2 })).toBe(DEFAULTS)
    expect(mergeColumnsSetting(DEFAULTS, stored({ hidden: 'name' }))).toBe(DEFAULTS)
  })

  it('restores the saved order, visibility and pinning, dropping columns that no longer exist', () => {
    const merged = mergeColumnsSetting(
      DEFAULTS,
      stored({ columnOrder: ['status', 'gone', 'name', 'index', 'actions'], hidden: ['gone'], start: ['name', 'gone'] })
    )
    expect(merged).toEqual({
      columnOrder: ['status', 'name', 'index', 'actions'],
      // The user showed `status`, which is hidden by default; the unpinned `actions` stays unpinned.
      columnVisibility: {},
      columnPinning: { start: ['name'], end: [] }
    })
  })

  it('gives columns added after the save their default place, visibility and pinning', () => {
    const merged = mergeColumnsSetting(
      DEFAULTS,
      stored({ columnOrder: ['name', 'index'], hidden: ['name'], start: ['index'] })
    )
    // Each new column follows its default predecessor: `status` after `name`, `actions` after `status`.
    expect(merged.columnOrder).toEqual(['name', 'status', 'actions', 'index'])
    expect(merged.columnVisibility).toEqual({ name: false, status: false })
    expect(merged.columnPinning).toEqual({ start: ['index'], end: ['actions'] })
  })

  it('never hides an always-visible column', () => {
    const merged = mergeColumnsSetting(DEFAULTS, stored({ hidden: ['index', 'name'] }), new Set(['index']))
    expect(merged.columnVisibility).toEqual({ name: false })
  })
})
