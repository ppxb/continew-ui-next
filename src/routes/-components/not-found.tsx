import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center space-y-2 text-center">
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-semibold">页面不存在</h1>
        <p className="text-muted-foreground">您访问的页面不存在或已被移动。</p>
      </div>
      <Button nativeButton={false} variant="outline" render={<Link to="/dashboard" replace />}>
        返回首页
      </Button>
    </main>
  )
}
