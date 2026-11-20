import AES from 'crypto-js/aes'
import Utf8 from 'crypto-js/enc-utf8'
import ECB from 'crypto-js/mode-ecb'
import Pkcs7 from 'crypto-js/pad-pkcs7'
import { JSEncrypt } from 'jsencrypt'

/**
 * Body encryption for endpoints guarded by continew-starter `encrypt-api`
 * (`ApiEncryptFilter`). Both directions use a fresh AES key per message:
 *
 * - body: AES/ECB/PKCS7 of the UTF-8 JSON, Base64 encoded (Hutool `SecureUtil.aes`);
 * - header: the AES key, Base64 encoded and then RSA (PKCS#1 v1.5) encrypted.
 *
 * Requests are sealed with `VITE_API_ENCRYPT_PUBLIC_KEY`, whose private half is the backend
 * `continew-starter.encrypt.api.private-key`. Responses carry a key sealed with the backend
 * `public-key`, so its private half has to ship in the bundle as `VITE_API_ENCRYPT_PRIVATE_KEY`.
 */
export const API_ENCRYPT_HEADER = 'X-Api-Encrypt'

const AES_KEY_LENGTH = 32
const AES_KEY_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomAesKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(AES_KEY_LENGTH))
  return Array.from(bytes, byte => AES_KEY_ALPHABET[byte % AES_KEY_ALPHABET.length]).join('')
}

function requireKey(key: string | undefined, name: string) {
  if (!key) {
    throw new Error(`${name} is not configured.`)
  }
  return key
}

const aesOptions = { mode: ECB, padding: Pkcs7 }

/** A sealed request: `body` goes out as the request body, `key` in `API_ENCRYPT_HEADER`. */
export interface SealedBody {
  body: string
  key: string
}

export function encryptRequestBody(json: string): SealedBody {
  const aesKey = randomAesKey()
  const rsa = new JSEncrypt()
  rsa.setPublicKey(requireKey(import.meta.env.VITE_API_ENCRYPT_PUBLIC_KEY, 'VITE_API_ENCRYPT_PUBLIC_KEY'))
  const key = rsa.encrypt(btoa(aesKey))

  if (!key) {
    throw new Error('Failed to encrypt the API key with VITE_API_ENCRYPT_PUBLIC_KEY.')
  }

  return { body: AES.encrypt(Utf8.parse(json), Utf8.parse(aesKey), aesOptions).toString(), key }
}

/** Opens a response body sealed by the backend, given the value of its `API_ENCRYPT_HEADER`. */
export function decryptResponseBody(body: string, key: string): string {
  const rsa = new JSEncrypt()
  rsa.setPrivateKey(requireKey(import.meta.env.VITE_API_ENCRYPT_PRIVATE_KEY, 'VITE_API_ENCRYPT_PRIVATE_KEY'))
  const encodedKey = rsa.decrypt(key)

  if (!encodedKey) {
    throw new Error('Failed to decrypt the API key with VITE_API_ENCRYPT_PRIVATE_KEY.')
  }

  return AES.decrypt(body, Utf8.parse(atob(encodedKey)), aesOptions).toString(Utf8)
}
