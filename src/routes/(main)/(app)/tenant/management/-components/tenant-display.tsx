import { EMPTY_PLACEHOLDER } from '@/lib/constants'

/** A plain text cell, with the shared placeholder for what the backend left empty. */
export function TextCell({ value }: { value: string | null | undefined }) {
  return <span>{value || EMPTY_PLACEHOLDER}</span>
}

/** `domain` holds a host without a protocol, so the link adds one when it opens. */
export function DomainCell({ domain }: { domain: string | null }) {
  if (!domain) {
    return <span className="text-sm text-destructive">未设置</span>
  }

  const href = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`

  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
      {domain}
    </a>
  )
}

/** An empty expiry means the tenant never expires. */
export function ExpireTimeCell({ value }: { value: string | null }) {
  return <span className={value ? 'text-sm' : 'text-sm text-muted-foreground'}>{value || '永不过期'}</span>
}
