import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from '#/lib/supabase/env'
import type { Database } from '#/lib/supabase/database.types'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, anonKey } = getSupabaseEnv()
    browserClient = createBrowserClient<Database>(url, anonKey)
  }
  return browserClient
}
