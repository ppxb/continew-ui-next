import type { ReactNode } from 'react'

interface ListFilterRowProps {
  readonly filters?: ReactNode
  readonly actions?: ReactNode
  /** Applied filter tags, on their own line under the row. */
  readonly tags?: ReactNode
}

/**
 * The filters-and-tools row that sits above every business table. Screens without their own page
 * header (the config tabs) use it directly; `ListPageCard` renders it for full list pages.
 */
export function ListFilterRow({ filters, actions, tags }: ListFilterRowProps) {
  if (!filters && !actions && !tags) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 px-4">
      {filters || actions ? (
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">{filters}</div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {tags}
    </div>
  )
}
