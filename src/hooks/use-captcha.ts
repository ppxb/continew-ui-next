import { useEffect, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { getImageCaptcha } from '@/lib/api/captcha'
import { captchaKeys } from '@/lib/query-keys'

export type CaptchaState = {
  uuid: string
  img: string
  isEnabled: boolean
  expireTime?: number
}

/**
 * Fetch the login captcha through TanStack Query: `refetch()` dedupes concurrent refreshes and an
 * in-flight request is aborted when a newer one starts, so a stale image can never overwrite a
 * fresh one. The captcha is optional — a failed fetch must not block the login form.
 */
export function useCaptcha() {
  const query = useQuery({
    queryKey: captchaKeys.image(),
    queryFn: ({ signal }) => getImageCaptcha(signal),
    // Every open of the login form should fetch a new captcha.
    staleTime: 0,
    gcTime: 0,
    retry: false
  })
  const captcha = query.data ?? null
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const expireTime = captcha?.expireTime
    setIsExpired(false)

    if (!expireTime) {
      return
    }

    const remaining = expireTime - Date.now()
    if (remaining <= 0) {
      setIsExpired(true)
      return
    }

    const timer = setTimeout(() => setIsExpired(true), remaining)
    return () => clearTimeout(timer)
  }, [captcha?.expireTime])

  return {
    captcha,
    /** Whether the backend requires a captcha; hidden until the first response. */
    isEnabled: captcha?.isEnabled ?? false,
    /** True once the captcha TTL has elapsed; the image can no longer be used. */
    isExpired: captcha !== null && isExpired,
    isLoading: query.isFetching,
    refresh: () => query.refetch()
  }
}
