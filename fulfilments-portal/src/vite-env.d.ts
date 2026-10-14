/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly DEV: boolean
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_FULFILMENTS_USE_MOCKS?: string
}
interface ImportMeta { readonly env: ImportMetaEnv }
