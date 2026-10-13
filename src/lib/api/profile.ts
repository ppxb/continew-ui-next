import { http } from '@/lib/http'

import type { UserPasswordUpdateReq } from './types'

/**
 * Changes the password of the signed-in user.
 *
 * The backend decrypts both fields with its RSA private key and enforces its own
 * policy (8-32 characters with at least one letter and one digit by default).
 */
export function updatePassword(req: UserPasswordUpdateReq) {
  return http.patch<void>('/user/profile/password', req, { silent: true })
}
