import { createFileRoute, Link } from '@tanstack/react-router'

import { ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/(main)/dashboard/mail')({
  component: Page
})

function Page() {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-sm leading-none font-medium">Mail preview</h1>
          <p className="text-sm text-muted-foreground">
            This iframe shows the standalone mail screen. Open it in full screen for a better view.
          </p>
        </div>
        <Button
          render={<Link to="/mail" target="_blank" rel="noreferrer" aria-label="Open mail in new tab" />}
          nativeButton={false}
          variant="ghost"
          size="icon-sm"
        >
          <ExternalLink />
        </Button>
      </div>

      <iframe src={`${import.meta.env.BASE_URL}mail`} title="Mail preview" className="min-h-0 flex-1 rounded-lg border bg-background" />
    </div>
  )
}
