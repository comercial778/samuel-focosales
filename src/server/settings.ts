import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireUser } from '#/server/context'
import { mapSettings } from '#/server/mappers'
import type { UserSettings } from '#/lib/types'

/** Workspace único: lê sempre a primeira linha de configurações existente. */
export const getSettings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<UserSettings> => {
    const { supabase } = await requireUser()

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .order('updated_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return { userId: '', baseSalary: 1700, shareEnabled: false, updatedAt: new Date().toISOString() }
    }
    return mapSettings(data)
  },
)

export const setSalary = createServerFn({ method: 'POST' })
  .validator(z.object({ baseSalary: z.number().min(0) }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()

    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, base_salary: data.baseSalary }, { onConflict: 'user_id' })

    if (error) throw error
    return { ok: true }
  })

export const setShareEnabled = createServerFn({ method: 'POST' })
  .validator(z.object({ shareEnabled: z.boolean() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser()

    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, share_enabled: data.shareEnabled }, { onConflict: 'user_id' })

    if (error) throw error
    return { ok: true }
  })
