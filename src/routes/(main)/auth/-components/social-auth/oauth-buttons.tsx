import { siGitee, siGithub, siWechat } from 'simple-icons'

import { SimpleIcon } from '@/components/simple-icon'
import { Button } from '@/components/ui/button'

const PROVIDERS = [
  { id: 'wechat', label: '微信', icon: siWechat },
  { id: 'github', label: 'GitHub', icon: siGithub },
  { id: 'gitee', label: 'Gitee', icon: siGitee }
] as const

export function OAuthButtons() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PROVIDERS.map(provider => (
        <Button key={provider.id} type="button" variant="outline" className="w-full">
          <SimpleIcon icon={provider.icon} className="size-4" />
          {provider.label}
        </Button>
      ))}
    </div>
  )
}
