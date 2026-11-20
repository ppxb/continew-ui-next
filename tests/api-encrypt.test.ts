import {
  constants,
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  privateDecrypt,
  publicEncrypt
} from 'node:crypto'

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { API_ENCRYPT_HEADER, decryptResponseBody, encryptRequestBody } from '@/lib/api-encrypt'
import { ApiError, http } from '@/lib/http'

// Two key pairs, as in continew-starter.encrypt.api: the backend decrypts requests with
// `private-key` and seals responses with `public-key`.
const requestPair = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})
const responsePair = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})

/** `RequestBodyDecryptWrapper.getDecryptContent` with Hutool's AES/ECB/PKCS5 and RSA/ECB/PKCS1 defaults. */
function backendDecryptRequest(body: string, header: string) {
  const encodedKey = privateDecrypt(
    { key: requestPair.privateKey, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(header, 'base64')
  ).toString('utf8')
  const aesKey = Buffer.from(encodedKey, 'base64')
  const decipher = createDecipheriv('aes-256-ecb', aesKey, null)
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8')
}

/** `ResponseBodyEncryptWrapper.getEncryptContent`. */
function backendEncryptResponse(content: string) {
  const aesKey = 'abcdefghijklmnopqrstuvwxyz012345'
  const header = publicEncrypt(
    { key: responsePair.publicKey, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(Buffer.from(aesKey).toString('base64'))
  ).toString('base64')
  const cipher = createCipheriv('aes-256-ecb', Buffer.from(aesKey), null)
  const body = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]).toString('base64')
  return { body, header }
}

beforeAll(() => {
  vi.stubEnv('VITE_API_ENCRYPT_PUBLIC_KEY', requestPair.publicKey)
  vi.stubEnv('VITE_API_ENCRYPT_PRIVATE_KEY', responsePair.privateKey)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api encryption', () => {
  it('seals a request body the backend filter can open', () => {
    const json = JSON.stringify({ username: '张三', remark: 'emoji 🎉' })
    const sealed = encryptRequestBody(json)

    expect(sealed.body).not.toContain('张三')
    expect(backendDecryptRequest(sealed.body, sealed.key)).toBe(json)
  })

  it('uses a fresh AES key for every request', () => {
    const json = JSON.stringify({ a: 1 })
    expect(encryptRequestBody(json).body).not.toBe(encryptRequestBody(json).body)
  })

  it('opens a response body sealed by the backend filter', () => {
    const json = JSON.stringify({ code: '0', success: true, data: { name: '李四' } })
    const { body, header } = backendEncryptResponse(json)

    expect(decryptResponseBody(body, header)).toBe(json)
  })

  it('encrypts only opted-in POST/PUT bodies and opens encrypted responses', async () => {
    const requests: { headers: Headers; body: unknown }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        requests.push({ headers: new Headers(init.headers), body: init.body })
        const { body, header } = backendEncryptResponse(JSON.stringify({ code: '0', success: true, data: 'ok' }))
        return new Response(body, { status: 200, headers: { [API_ENCRYPT_HEADER]: header } })
      })
    )

    await expect(http.post('/system/user', { name: '王五' }, { encrypt: true })).resolves.toBe('ok')
    await expect(http.post('/system/user', { name: '王五' })).resolves.toBe('ok')
    await expect(http.patch('/system/user', { name: '王五' }, { encrypt: true })).resolves.toBe('ok')

    const [sealed, plain, patched] = requests
    expect(backendDecryptRequest(String(sealed.body), sealed.headers.get(API_ENCRYPT_HEADER)!)).toBe(
      JSON.stringify({ name: '王五' })
    )
    expect(plain.headers.has(API_ENCRYPT_HEADER)).toBe(false)
    expect(plain.body).toBe(JSON.stringify({ name: '王五' }))
    expect(patched.headers.has(API_ENCRYPT_HEADER)).toBe(false)
    expect(patched.body).toBe(JSON.stringify({ name: '王五' }))
  })

  it('fails as a silent ApiError without sending when the public key is missing', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    vi.stubEnv('VITE_API_ENCRYPT_PUBLIC_KEY', '')

    try {
      const error = await http.post('/system/user', { a: 1 }, { encrypt: true, silent: true }).catch(e => e)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.notified).toBe(false)
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      vi.stubEnv('VITE_API_ENCRYPT_PUBLIC_KEY', requestPair.publicKey)
    }
  })
})
