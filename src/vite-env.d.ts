/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dev proxy prefix; when set it takes precedence over VITE_API_BASE_URL. */
  readonly VITE_API_PREFIX?: string
  /** Backend origin in development, or the API base path/origin in production. */
  readonly VITE_API_BASE_URL: string
  /** Client id registered in the backend sys_client table. */
  readonly VITE_CLIENT_ID: string
  /** RSA public key matching the backend password-encryption key pair. */
  readonly VITE_APP_RSA_PUBLIC_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
