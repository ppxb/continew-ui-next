import { type ErrorComponentProps, Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-semibold">Something went wrong.</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred while loading this page. Try again or return to the dashboard.
        </p>
        {import.meta.env.DEV ? (
          <p className="text-sm text-destructive">{error instanceof Error ? error.message : String(error)}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button nativeButton={false} variant="outline" render={<Link to="/dashboard/default" replace />}>
          Go to dashboard
        </Button>
      </div>
    </main>
  )
}
