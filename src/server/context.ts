import { getSupabaseServerClient } from '#/lib/supabase/server'

/** Garante que existe uma sessão válida; lança erro (401) caso contrário. */
export async function requireUser() {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('UNAUTHENTICATED')
  }

  return { supabase, user }
}
