import * as React from 'react'

import { siGitee, siGithub, siWechat } from 'simple-icons'

import { SimpleIcon } from '@/components/simple-icon'
import { Button } from '@/components/ui/button'
import { socialAuthorize } from '@/lib/api/auth'
import { reportError } from '@/lib/http'

/** The source keys the backend accepts; `wechat_open` is the web (open-platform) variant. */
const PROVIDERS = [
  { id: 'wechat_open', label: '微信', icon: siWechat },
  { id: 'github', label: 'GitHub', icon: siGithub },
  { id: 'gitee', label: 'Gitee', icon: siGitee }
] as const

export function OAuthButtons() {
  const [pending, setPending] = React.useState<string | null>(null)

  const start = async (source: string) => {
    if (pending !== null) {
      return
    }

    setPending(source)

    try {
      const { authorizeUrl } = await socialAuthorize(source)

      if (!/^https?:\/\//i.test(authorizeUrl)) {
        throw new Error('授权地址无效')
      }

      window.location.href = authorizeUrl
    } catch (error) {
      reportError(error, '暂时无法发起登录，请稍后重试')
      setPending(null)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {PROVIDERS.map(provider => (
        <Button
          key={provider.id}
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending !== null}
          onClick={() => void start(provider.id)}
        >
          <SimpleIcon icon={provider.icon} className="size-4" />
          {provider.label}
        </Button>
      ))}
    </div>
  )
}
