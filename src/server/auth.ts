import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '#/lib/supabase/server'
import type { MyContext } from '#/lib/types'

export const getMyContext = createServerFn({ method: 'GET' }).handler(
  async (): Promise<MyContext | null> => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()

    return {
      userId: user.id,
      email: user.email ?? '',
      displayName: profile?.display_name ?? null,
    }
  },
)
