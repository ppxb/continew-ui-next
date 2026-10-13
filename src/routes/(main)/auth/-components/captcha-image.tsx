import { cn } from 'cn'
import { Loader2Icon } from 'lucide-react'

interface CaptchaImageProps {
  readonly img?: string
  readonly isEnabled: boolean
  readonly isLoading: boolean
  readonly onRefresh: () => void
}

/** Graphic captcha; clicking it requests a new one. */
export function CaptchaImage({ img, isEnabled, isLoading, onRefresh }: CaptchaImageProps) {
  if (!isEnabled) {
    return null
  }

  return (
    <button
      type="button"
      onClick={onRefresh}
      title="Click to refresh"
      aria-label="Refresh captcha"
      className={cn(
        'relative flex h-9 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 transition-colors hover:bg-muted',
        isLoading && 'opacity-60'
      )}
    >
      {img ? <img src={img} alt="Captcha" className="h-full w-full object-contain" /> : null}
      {isLoading ? <Loader2Icon className="absolute size-4 animate-spin text-muted-foreground" /> : null}
    </button>
  )
}
