import { useCallback, useEffect, useState } from 'react'

import { getImageCaptcha } from '@/lib/api/captcha'

export type CaptchaState = {
  uuid: string
  img: string
  isEnabled: boolean
}

export function useCaptcha() {
  const [captcha, setCaptcha] = useState<CaptchaState | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)

    try {
      const payload = await getImageCaptcha()
      setCaptcha({ uuid: payload.uuid, img: payload.img, isEnabled: payload.isEnabled })
    } catch {
      // The captcha is optional: a failed request must not block the login form.
      setCaptcha(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    captcha,
    /** Whether the backend requires a captcha; hidden until the first response. */
    isEnabled: captcha?.isEnabled ?? false,
    isLoading,
    refresh
  }
}
