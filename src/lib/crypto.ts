import { JSEncrypt } from 'jsencrypt'

/**
 * Encrypts a payload the backend decrypts with its RSA private key.
 *
 * A login password goes through `SecureUtils.decryptPasswordByRsaPrivateKey` and a storage Secret
 * Key through `SecureUtils.decryptByRsaPrivateKey`; both read the same `RsaProperties` key pair,
 * so one helper covers both. That decryption uses PKCS#1 v1.5 padding, and WebCrypto only supports
 * OAEP, so JSEncrypt is used.
 */
export function encryptByRsa(plainText: string): string {
  const publicKey = import.meta.env.VITE_APP_RSA_PUBLIC_KEY

  if (!publicKey || publicKey.startsWith('REPLACE_WITH')) {
    throw new Error('VITE_APP_RSA_PUBLIC_KEY is not configured.')
  }

  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(publicKey)

  const encrypted = encryptor.encrypt(plainText)

  if (!encrypted) {
    throw new Error('Failed to encrypt the payload with the configured RSA public key.')
  }

  return encrypted
}

/** Encrypts the login password; the name every password screen calls it by. */
export const encryptPassword = encryptByRsa
