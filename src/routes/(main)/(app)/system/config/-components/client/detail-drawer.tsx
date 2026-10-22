import { Smartphone } from 'lucide-react'

import { CopyableText } from '@/components/copyable-text'
import { DetailField, DetailGrid } from '@/components/detail-field'
import { EntityDrawer } from '@/components/entity-drawer'
import { StatusCell } from '@/components/status-cell'
import { Badge } from '@/components/ui/badge'
import type { ClientResp } from '@/lib/api/client'
import { EMPTY_PLACEHOLDER } from '@/lib/constants'

import { AUTH_TYPE_MAP, LOGOUT_MODE_MAP, REFRESH_TOKEN_MODE_MAP, REPLACED_RANGE_MAP } from './columns'

interface ClientDetailDrawerProps {
  readonly client: ClientResp | null
  readonly open: boolean
  readonly clientTypeMap: Record<string, string>
  readonly authTypeMap?: Record<string, string>
  readonly replacedRangeMap?: Record<string, string>
  readonly logoutModeMap?: Record<string, string>
  readonly onClose: () => void
}

export function ClientDetailDrawer({
  client,
  open,
  clientTypeMap,
  authTypeMap = AUTH_TYPE_MAP,
  replacedRangeMap = REPLACED_RANGE_MAP,
  logoutModeMap = LOGOUT_MODE_MAP,
  onClose
}: ClientDetailDrawerProps) {
  // Keep the Drawer mounted while closed so the first open still plays its enter transition; guard the body instead.
  return (
    <EntityDrawer open={open} onClose={onClose} title="客户端详情" icon={<Smartphone className="size-4" />} width={32}>

        {client ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <DetailGrid>
              <DetailField label="ID">{client.id}</DetailField>
              <DetailField label="客户端 ID" className="sm:col-span-2">
                <CopyableText
                  value={client.clientId}
                  label="复制客户端 ID"
                  successMessage="已复制客户端 ID"
                  className="break-all"
                />
              </DetailField>
              <DetailField label="客户端类型" className="sm:col-span-2">
                <Badge variant="outline">{clientTypeMap[client.clientType] || client.clientType}</Badge>
              </DetailField>
              <DetailField label="认证类型" className="sm:col-span-2">
                <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
                  {client.authType?.map(at => (
                    <Badge key={at} variant="secondary" className="shrink-0 font-normal whitespace-nowrap">
                      {authTypeMap[at] || at}
                    </Badge>
                  ))}
                </div>
              </DetailField>
              <DetailField label="Token 最低活跃频率">
                <span>{client.activeTimeout === -1 ? '不限制' : `${client.activeTimeout} 秒`}</span>
              </DetailField>
              <DetailField label="Token 有效期">
                <span>{client.timeout === -1 ? '永不过期' : `${client.timeout} 秒`}</span>
              </DetailField>
              <DetailField label="Refresh Token 有效期">
                <span>{client.refreshTokenTimeout ? `${client.refreshTokenTimeout} 秒` : EMPTY_PLACEHOLDER}</span>
              </DetailField>
              <DetailField label="Refresh Token 传输模式">
                <span>
                  {client.refreshTokenMode
                    ? REFRESH_TOKEN_MODE_MAP[client.refreshTokenMode] || client.refreshTokenMode
                    : EMPTY_PLACEHOLDER}
                </span>
              </DetailField>
              <DetailField label="状态" className="sm:col-span-2">
                <StatusCell status={client.status} />
              </DetailField>
              <DetailField label="多地登录">
                <Badge variant={client.isConcurrent ? 'default' : 'secondary'} className="font-normal">
                  {client.isConcurrent ? '允许' : '互斥'}
                </Badge>
              </DetailField>
              <DetailField label="下线范围">
                <span>
                  {client.replacedRange
                    ? replacedRangeMap[client.replacedRange] || client.replacedRange
                    : EMPTY_PLACEHOLDER}
                </span>
              </DetailField>
              <DetailField label="登录数量">
                <span>
                  {client.maxLoginCount === -1
                    ? '不限制'
                    : client.maxLoginCount !== undefined && client.maxLoginCount !== null
                      ? `${client.maxLoginCount} 个`
                      : EMPTY_PLACEHOLDER}
                </span>
              </DetailField>
              <DetailField label="溢出处理">
                <span>
                  {client.overflowLogoutMode
                    ? logoutModeMap[client.overflowLogoutMode] || client.overflowLogoutMode
                    : EMPTY_PLACEHOLDER}
                </span>
              </DetailField>
              <DetailField label="创建人">{client.createUserString || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="创建时间">{client.createTime || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="修改人">{client.updateUserString || EMPTY_PLACEHOLDER}</DetailField>
              <DetailField label="修改时间">{client.updateTime || EMPTY_PLACEHOLDER}</DetailField>
            </DetailGrid>
          </div>
        ) : null}
    </EntityDrawer>
  )
}
