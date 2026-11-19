import { http } from '@/lib/http'

import type { CaptchaResp } from './types'

/**
 * Fetches the graphic captcha.
 *
 * `isEnabled` reports whether the backend requires it, and `uuid` must be sent
 * back with the login request.
 */
export function getImageCaptcha(signal?: AbortSignal) {
  return http.get<CaptchaResp>('/captcha/image', { signal, skipAuthRefresh: true, silent: true })
}
