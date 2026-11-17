import { LogOut } from 'lucide-react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLastRecord } from '@/hooks/use-last-record'
import { kickoutOnlineUser, onlineUserKeys, type OnlineUserResp } from '@/lib/api/online'

interface OnlineUserKickoutDialogProps {
  /** The session being kicked out, or `null` before the first one is picked. */
  readonly user: OnlineUserResp | null
  readonly open: boolean
  readonly onClose: () => void
}

export function OnlineUserKickoutDialog({ user, open, onClose }: OnlineUserKickoutDialogProps) {
  const shownUser = useLastRecord(user)

  const sessionLabel = shownUser
    ? `${shownUser.nickname || shownUser.username}${shownUser.nickname ? `(${shownUser.username})` : ''}`
    : ''
  const shownTarget = shownUser?.ip ? `${sessionLabel}（IP ${shownUser.ip}）` : sessionLabel

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      tone="danger"
      icon={<LogOut />}
      title="强退在线用户"
      description={
        shownUser
          ? `是否确定强退「${shownTarget}」的登录会话？强退后该会话立即失效，用户需要重新登录。`
          : '是否确定强退该登录会话？强退后该会话立即失效，用户需要重新登录。'
      }
      confirmLabel="强退"
      pendingLabel="强退中"
      disabled={user === null}
      action={() => kickoutOnlineUser(user!.sessionId)}
      // The session disappears from every cached page, not just the current one.
      invalidateKeys={[onlineUserKeys.all]}
      successMessage="强退成功"
    />
  )
}
