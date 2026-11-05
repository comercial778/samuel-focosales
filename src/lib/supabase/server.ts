import { createServerClient } from '@supabase/ssr'
import { getCookies, setCookie } from '@tanstack/react-start/server'
import { getSupabaseEnv } from '#/lib/supabase/env'
import type { Database } from '#/lib/supabase/database.types'

/** Cliente Supabase para uso dentro de server functions (createServerFn), com sessão via cookies. */
export function getSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv()

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        const cookies = getCookies()
        return Object.entries(cookies).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, options)
        }
      },
    },
  })
}
