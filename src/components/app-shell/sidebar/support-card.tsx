import { siGithub } from 'simple-icons'

import { SimpleIcon } from '@/components/simple-icon'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Where to send people for help with this project. */
const DOCS_URL = 'https://continew.top/docs/admin'
const REPOSITORY_URL = 'https://github.com/ppxb/continew-ui-next'

export function SupportCard() {
  return (
    <Card size="sm" className="overflow-hidden shadow-none group-data-[collapsible=icon]:hidden">
      <CardHeader className="min-w-0 px-4">
        <CardTitle className="truncate text-sm">需要帮助？</CardTitle>
        <CardDescription className="line-clamp-3">
          遇到问题或有建议，请查阅
          <a href={DOCS_URL} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
            在线文档
          </a>
          ，或到
          <a
            href={`${REPOSITORY_URL}/issues`}
            target="_blank"
            rel="noreferrer"
            className="mx-1 inline-flex items-center gap-1 text-foreground hover:underline"
          >
            <SimpleIcon icon={siGithub} aria-hidden className="size-3 fill-foreground" />
            GitHub
          </a>
          提交。
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
