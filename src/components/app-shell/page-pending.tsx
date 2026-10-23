import { Skeleton } from '@/components/ui/skeleton'

export function PagePending() {
  return (
    <div className="flex flex-col gap-4 motion-safe:animate-in motion-safe:duration-150 motion-safe:fade-in">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-8 w-32" />
      </div>

      <Skeleton className="h-96 w-full" />
    </div>
  )
}
