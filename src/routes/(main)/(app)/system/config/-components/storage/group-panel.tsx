import type { ReactNode } from 'react'

import type { QueryKey } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'

import { ProTable, type ProColumns } from '@/components/pro'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { StorageRecord } from './columns'

interface StorageGroupPanelProps {
  readonly title: string
  readonly icon: ReactNode
  readonly minWidth: string
  readonly items: StorageRecord[]
  readonly columns: readonly ProColumns<StorageRecord>[]
  readonly queryKey: QueryKey
  readonly params: { keyword: string; type?: number; status?: number }
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isShowingPreviousRows: boolean
}

/**
 * One storage type as a collapsible group panel holding its table, sharing the dictionary screen's
 * section shape: a top-separated section whose header carries the group name and row count.
 */
export function StorageGroupPanel({
  title,
  icon,
  minWidth,
  items,
  columns,
  queryKey,
  params,
  isLoading,
  isError,
  isShowingPreviousRows
}: StorageGroupPanelProps) {
  return (
    <Collapsible defaultOpen className="flex flex-col border-t">
      <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              className="group -ml-2 h-auto w-full justify-start gap-2 px-2 py-1 hover:bg-transparent aria-expanded:bg-transparent sm:flex-1"
            />
          }
        >
          <ChevronDown className="group-data-panel-open:rotate-180" />
          <span className="flex min-w-0 items-center gap-1.5 text-left">
            {icon}
            <span className="shrink-0 leading-none font-medium">{title}</span>
            <span className="text-sm text-muted-foreground">({items.length})</span>
          </span>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <ProTable<StorageRecord>
          cardProps={false}
          embedded
          dataSource={items}
          columns={columns}
          rowKey="id"
          queryKey={queryKey}
          params={params}
          pagination={false}
          options={false}
          search={false}
          loading={isLoading}
          isError={isError}
          isShowingPreviousRows={isShowingPreviousRows}
          locale={{ emptyText: `暂无${title}配置` }}
          tableClassName={`${minWidth} **:data-[slot='table-cell']:px-5 **:data-[slot='table-head']:px-5`}
        />
      </CollapsibleContent>
    </Collapsible>
  )
}
