import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireUser } from '#/server/context'
import { mapGoal } from '#/server/mappers'
import type { SalesGoal } from '#/lib/types'

export const listGoals = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SalesGoal[]> => {
    const { supabase } = await requireUser()
    const { data, error } = await supabase
      .from('sales_goals')
      .select('*')
      .order('cycle_start', { ascending: false })
    if (error) throw error
    return data.map(mapGoal)
  },
)

export const upsertGoal = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      cycleStart: z.string(),
      cycleEnd: z.string(),
      goalAmount: z.number().min(0),
      receivedOverride: z.number().nullable().optional(),
      soldOverride: z.number().nullable().optional(),
    }),
  )
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabase, user } = await requireUser()

    const row = {
      owner_id: user.id,
      cycle_start: data.cycleStart,
      cycle_end: data.cycleEnd,
      goal_amount: data.goalAmount,
      received_override: data.receivedOverride ?? null,
      sold_override: data.soldOverride ?? null,
    }

    if (data.id) {
      const { error } = await supabase.from('sales_goals').update(row).eq('id', data.id)
      if (error) throw error
      return { id: data.id }
    }

    const { data: inserted, error } = await supabase
      .from('sales_goals')
      .upsert(row, { onConflict: 'cycle_start,cycle_end' })
      .select('id')
      .single()
    if (error) throw error
    return { id: inserted.id }
  })
