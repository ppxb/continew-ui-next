import { Spinner } from '@/components/ui/spinner'

export function PagePending() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
      <Spinner className="size-5" />
    </div>
  )
}
