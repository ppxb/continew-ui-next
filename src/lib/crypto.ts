import { JSEncrypt } from 'jsencrypt'

/**
 * Encrypts the login password with the backend RSA public key.
 *
 * The backend decrypts it with `SecureUtils.decryptPasswordByRsaPrivateKey`, which
 * uses PKCS#1 v1.5 padding. WebCrypto only supports OAEP, so JSEncrypt is used.
 */
export function encryptPassword(plainPassword: string): string {
  const publicKey = import.meta.env.VITE_APP_RSA_PUBLIC_KEY

  if (!publicKey || publicKey.startsWith('REPLACE_WITH')) {
    throw new Error('VITE_APP_RSA_PUBLIC_KEY is not configured.')
  }

  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(publicKey)

  const encrypted = encryptor.encrypt(plainPassword)

  if (!encrypted) {
    throw new Error('Failed to encrypt the password with the configured RSA public key.')
  }

  return encrypted
}
