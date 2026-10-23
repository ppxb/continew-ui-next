import { cn } from 'cn'
import { ScrollText } from 'lucide-react'

import { DetailField, DetailGrid } from '@/components/detail-field'
import { EntityDrawer } from '@/components/entity-drawer'
import { JsonViewer, type JsonValue } from '@/components/json-viewer/json-viewer'
import { QueryState } from '@/components/query-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { LogStatusCell, TimeTakenCell } from './log-display'
import { useLogDetail } from './use-log-detail'

const RAW_PAYLOAD_CLASS = cn(
  'max-h-72 overflow-auto overscroll-contain rounded-lg border bg-muted/40 p-3',
  'text-xs leading-relaxed break-all whitespace-pre-wrap'
)

type ParsedPayload =
  | { readonly kind: 'json'; readonly data: JsonValue }
  | { readonly kind: 'text'; readonly text: string }

/** Parses a captured payload; a body that is not JSON stays readable as plain text. */
function parsePayload(raw: string | null): ParsedPayload | null {
  if (!raw) {
    return null
  }

  try {
    return { kind: 'json', data: JSON.parse(raw) as JsonValue }
  } catch {
    return { kind: 'text', text: raw }
  }
}

function Payload({ value, statusCode }: { value: string | null; statusCode?: number | null }) {
  const payload = parsePayload(value)

  if (!payload) {
    return <span className="text-sm text-muted-foreground">无</span>
  }

  if (payload.kind === 'text') {
    return <pre className={RAW_PAYLOAD_CLASS}>{payload.text}</pre>
  }

  return <JsonViewer data={payload.data} statusCode={statusCode} />
}

/** The 响应信息 and 请求信息 blocks: the Vue drawer keeps the headers and the body in tabs. */
function PayloadTabs({
  headers,
  body,
  headersLabel,
  bodyLabel,
  statusCode
}: {
  headers: string | null
  body: string | null
  headersLabel: string
  bodyLabel: string
  statusCode?: number | null
}) {
  return (
    <Tabs defaultValue="headers">
      <TabsList>
        <TabsTrigger value="headers">{headersLabel}</TabsTrigger>
        <TabsTrigger value="body">{bodyLabel}</TabsTrigger>
      </TabsList>
      <TabsContent value="headers" className="pt-2">
        <Payload value={headers} statusCode={statusCode} />
      </TabsContent>
      <TabsContent value="body" className="pt-2">
        <Payload value={body} statusCode={statusCode} />
      </TabsContent>
    </Tabs>
  )
}

function LogDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-20" />
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="flex flex-col gap-1">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

interface LogDetailDrawerProps {
  /** The log to show, or `null` before the first one is picked. */
  readonly logId: string | number | null
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Read-only detail panel for one operation log.
 *
 * The fields and their order follow the Vue client's `OperationLogDetailDrawer.vue`: basic
 * info first (日志 ID and Trace ID share a row on wider screens), then the response, then
 * the request, each with its headers and body in tabs.
 */
export function LogDetailDrawer({ logId, open, onClose }: LogDetailDrawerProps) {
  const query = useLogDetail(logId, { enabled: open })
  const detail = query.data

  return (
    <EntityDrawer open={open} onClose={onClose} title="日志详情" icon={<ScrollText className="size-4" />} width={40}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {query.isPending ? (
          <LogDetailSkeleton />
        ) : query.isError || !detail ? (
          <QueryState state="error" onRetry={() => void query.refetch()} />
        ) : (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-foreground">基本信息</h3>
              <DetailGrid>
                <DetailField label="日志 ID">
                  <span className="break-all">{detail.id}</span>
                </DetailField>
                <DetailField label="Trace ID">
                  <span className="break-all">{detail.traceId || EMPTY_PLACEHOLDER}</span>
                </DetailField>
                <DetailField label="操作人">{detail.createUserString || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="操作时间">{detail.createTime || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="操作内容">{detail.description || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="所属模块">{detail.module || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="操作 IP">{detail.ip || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="操作地点">{detail.address || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="浏览器">{detail.browser || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="终端系统">{detail.os || EMPTY_PLACEHOLDER}</DetailField>
                <DetailField label="状态">
                  <LogStatusCell status={detail.status} errorMsg={detail.errorMsg} />
                </DetailField>
                <DetailField label="耗时">
                  <TimeTakenCell timeTaken={detail.timeTaken} />
                </DetailField>
                <DetailField label="请求 URI" className="sm:col-span-2">
                  <span className="break-all">{detail.requestUrl || EMPTY_PLACEHOLDER}</span>
                </DetailField>
              </DetailGrid>
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-foreground">响应信息</h3>
              <PayloadTabs
                headers={detail.responseHeaders}
                body={detail.responseBody}
                headersLabel="响应头"
                bodyLabel="响应体"
                statusCode={detail.statusCode}
              />
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-foreground">请求信息</h3>
              <PayloadTabs
                headers={detail.requestHeaders}
                body={detail.requestBody}
                headersLabel="请求头"
                bodyLabel="请求体"
                statusCode={detail.statusCode}
              />
            </section>
          </div>
        )}
      </div>
    </EntityDrawer>
  )
}
