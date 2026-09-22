import { createServerFn } from '@tanstack/react-start'
import { requireUser } from '#/server/context'
import type { AppRole, Profile } from '#/lib/types'

export const listWorkspaceUsers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Profile[]> => {
    const { supabase } = await requireUser()

    const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] =
      await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: true }),
        supabase.from('user_roles').select('user_id, role'),
      ])

    if (profilesError) throw profilesError
    if (rolesError) throw rolesError

    const roleByUser = new Map<string, AppRole>()
    for (const r of roles) {
      if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role)
    }

    return profiles.map((p) => ({
      id: p.id,
      email: p.email,
      displayName: p.display_name,
      createdAt: p.created_at,
      role: roleByUser.get(p.id) ?? null,
    }))
  },
)
