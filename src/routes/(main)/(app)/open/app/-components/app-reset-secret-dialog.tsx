import { RotateCcw } from 'lucide-react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLastRecord } from '@/hooks/use-last-record'
import { appKeys, type AppResp, resetAppSecret } from '@/lib/api/app'

import { appLabel } from './app-display'

interface AppResetSecretDialogProps {
  readonly app: AppResp | null
  readonly open: boolean
  readonly onClose: () => void
  readonly onSuccess?: (app: AppResp) => void
}

export function AppResetSecretDialog({ app, open, onClose, onSuccess }: AppResetSecretDialogProps) {
  const shownApp = useLastRecord(app)
  const shownLabel = appLabel(shownApp)

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      tone="warning"
      icon={<RotateCcw />}
      title="重置应用密钥"
      description={
        shownApp
          ? `确定重置应用「${shownLabel}」的密钥吗？重置后原 Secret Key 将立即作废，使用旧密钥的外部服务将无法正常调用接口。`
          : '重置密钥后，原 Secret Key 将立即作废，使用旧密钥的外部服务将无法正常调用接口。是否确定重置？'
      }
      confirmLabel="确认重置"
      pendingLabel="重置中"
      disabled={app === null}
      action={() => resetAppSecret(app!.id)}
      invalidateKeys={app ? [appKeys.secret(app.id)] : undefined}
      successMessage="重置密钥成功"
      onSuccess={() => {
        if (app) {
          onSuccess?.(app)
        }
      }}
    />
  )
}
