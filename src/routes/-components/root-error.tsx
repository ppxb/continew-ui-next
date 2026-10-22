import { type ErrorComponentProps, Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-semibold">页面出错了</h1>
        <p className="text-muted-foreground">加载页面时发生意外错误，请重试或返回首页。</p>
        {import.meta.env.DEV ? (
          <p className="text-sm text-destructive">{error instanceof Error ? error.message : String(error)}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>重试</Button>
        <Button nativeButton={false} variant="outline" render={<Link to="/dashboard" replace />}>
          返回首页
        </Button>
      </div>
    </main>
  )
}
