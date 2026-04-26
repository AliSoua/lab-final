/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_TOKEN_REFRESH_INTERVAL_MINUTES: string
  readonly VITE_MAX_REFRESH_RETRIES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}