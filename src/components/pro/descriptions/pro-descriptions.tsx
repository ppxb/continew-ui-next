import { hashKey, useQuery } from '@tanstack/react-query'
import { cn } from 'cn'

import { DetailField, DetailGrid } from '@/components/detail-field'
import { QueryState } from '@/components/query-state'
import { Skeleton } from '@/components/ui/skeleton'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { getColumnKey, getColumnTitle, getFieldColumns } from '../column-utils'
import { ProField } from '../field/pro-field'
import type { ProDescriptionsProps, ProValues } from '../typing'

export function ProDescriptions<T, U = ProValues>({
  columns,
  dataSource,
  request,
  params,
  queryKey,
  title,
  column = 2,
  emptyText = EMPTY_PLACEHOLDER,
  loading = false,
  className
}: ProDescriptionsProps<T, U>) {
  const configurationError = !!request && !queryKey?.length
  const key =
    queryKey === undefined ? ['pro-descriptions-unconfigured'] : params === undefined ? queryKey : [...queryKey, params]
  const query = useQuery({
    queryKey: key,
    enabled: dataSource === undefined && !!request && !configurationError,
    queryFn: async ({ signal }) => {
      if (!request) throw new Error('ProDescriptions request is not configured')
      const response = await request(params as U, signal)
      if (response.success === false) throw new Error('数据加载失败')
      return response.data
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false
  })
  const record = dataSource ?? (request ? query.data : undefined)
  const fields = getFieldColumns(columns, record === undefined ? undefined : (record as Partial<T>)).filter(
    item => !item.hideInDescriptions && item.valueType !== 'index' && item.valueType !== 'option'
  )
  const gridClassName = column === 1 ? 'sm:grid-cols-1' : undefined
  const content = configurationError ? (
    <QueryState state="error" title="ProDescriptions 配置错误：request 必须提供 queryKey" />
  ) : request && dataSource === undefined && query.isError ? (
    <QueryState
      state="error"
      onRetry={() => {
        void query.refetch()
      }}
    />
  ) : loading || (request && dataSource === undefined && query.isPending) ? (
    <DetailGrid key={hashKey(key)} className={gridClassName}>
      {fields.map((item, index) => (
        <DetailField
          key={getColumnKey(item, index)}
          label={getColumnTitle(item, 'descriptions')}
          className={column === 2 && item.span === 2 ? 'sm:col-span-2' : undefined}
        >
          <Skeleton className="h-4 w-32" />
        </DetailField>
      ))}
    </DetailGrid>
  ) : record === undefined || record === null || fields.length === 0 ? (
    <div className="text-sm text-muted-foreground">{emptyText}</div>
  ) : (
    <DetailGrid className={gridClassName}>
      {fields.map((item, index) => {
        const value = item.dataIndex ? (record as ProValues)[item.dataIndex] : undefined
        const text = item.renderText ? item.renderText(value, record, index, undefined) : value
        const dom = (
          <ProField column={item} value={text} type="descriptions" mode="read" emptyText={emptyText} entity={record} />
        )
        return (
          <DetailField
            key={getColumnKey(item, index)}
            label={getColumnTitle(item, 'descriptions')}
            className={column === 2 && item.span === 2 ? 'sm:col-span-2' : undefined}
          >
            {item.render
              ? item.render(dom, record, index, undefined, { ...item, type: 'descriptions', entity: record })
              : dom}
          </DetailField>
        )
      })}
    </DetailGrid>
  )
  return (
    <section className={cn('space-y-4 text-sm', className)}>
      {title ? <h3 className="font-medium">{title}</h3> : null}
      {content}
    </section>
  )
}
