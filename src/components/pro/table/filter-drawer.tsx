import * as React from 'react'

import { ListFilter } from 'lucide-react'

import { EntityDrawer } from '@/components/entity-drawer'
import { Button } from '@/components/ui/button'
import { DrawerFooter } from '@/components/ui/drawer'
import type { ProFieldColumn, ProFormInstance, ProValues } from '../typing'
import { ProTableSearchFields } from './form-render'
import { formatSearchValues, isNonempty } from './table-state'

interface FilterDrawerProps<T> {
  /** The drawer filters; every one has a `dataIndex`. */
  readonly columns: readonly ProFieldColumn<T>[]
  /** The applied search values. */
  readonly values: ProValues
  /** What 重置 restores each filter to. */
  readonly initialValues: ProValues
  readonly form: ProFormInstance
  readonly onApply: (patch: ProValues) => void
}

function sameValue(left: unknown, right: unknown) {
  if (!isNonempty(left) && !isNonempty(right)) return true
  return JSON.stringify(left) === JSON.stringify(right)
}

/**
 * The 筛选 button and its drawer. Edits stay in a draft until 应用; closing with unapplied edits
 * asks first, like any edited drawer.
 */
export function FilterDrawer<T>({ columns, values, initialValues, form, onApply }: FilterDrawerProps<T>) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<ProValues>({})
  const names = columns.map(column => column.dataIndex!)
  const applied = columns.filter(column => Object.keys(formatSearchValues([column], values)).length > 0).length
  const dirty = open && names.some(name => !sameValue(draft[name], values[name]))

  return (
    <>
      <Button
        variant="outline"
        className="justify-start sm:justify-center"
        onClick={() => {
          setDraft(Object.fromEntries(names.map(name => [name, values[name]])))
          setOpen(true)
        }}
      >
        <ListFilter />
        筛选
        {applied > 0 ? (
          <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground tabular-nums">
            {applied}
          </span>
        ) : null}
      </Button>
      <EntityDrawer
        open={open}
        onClose={() => setOpen(false)}
        title="筛选"
        icon={<ListFilter className="size-4" />}
        width={30}
        dirty={dirty}
      >
        {/* A labelled form; controls fill the drawer width, whatever width they take inline. */}
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 *:*:w-full *:*:sm:w-full [&_[data-slot=popover-trigger]]:w-full">
          <ProTableSearchFields
            columns={columns}
            values={draft}
            form={form}
            labelled
            onChange={(name, value) => setDraft(current => ({ ...current, [name]: value }))}
          />
        </div>
        <DrawerFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDraft(Object.fromEntries(names.map(name => [name, initialValues[name]])))}
          >
            重置
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply(draft)
              setOpen(false)
            }}
          >
            应用
          </Button>
        </DrawerFooter>
      </EntityDrawer>
    </>
  )
}
