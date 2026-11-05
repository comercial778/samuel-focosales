import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireUser } from '#/server/context'
import { mapReceipt } from '#/server/mappers'
import type { Receipt } from '#/lib/types'

const RECEIPTS_BUCKET = 'receipts'

export const listAllReceipts = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Receipt[]> => {
    const { supabase } = await requireUser()
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data.map(mapReceipt)
  },
)

export const listReceipts = createServerFn({ method: 'GET' })
  .validator(z.object({ saleId: z.string().uuid() }))
  .handler(async ({ data }): Promise<Receipt[]> => {
    const { supabase } = await requireUser()
    const { data: rows, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('sale_id', data.saleId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return rows.map(mapReceipt)
  })

/**
 * Registra um comprovante/contrato. `path` é a URL externa (ex.: link do Google
 * Drive) quando `mime` começa com "link/", ou a chave do objeto no bucket
 * `receipts` para arquivos enviados via upload direto do browser.
 */
export const recordReceipt = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      saleId: z.string().uuid(),
      installmentId: z.string().uuid().nullable(),
      path: z.string().min(1),
      filename: z.string().min(1),
      mime: z.string().nullable(),
      size: z.number().nullable(),
    }),
  )
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabase, user } = await requireUser()

    const { data: inserted, error } = await supabase
      .from('receipts')
      .insert({
        owner_id: user.id,
        sale_id: data.saleId,
        installment_id: data.installmentId,
        path: data.path,
        filename: data.filename,
        mime: data.mime,
        size: data.size,
      })
      .select('id')
      .single()

    if (error) throw error
    return { id: inserted.id }
  })

export const deleteReceipt = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()

    const { data: receipt, error: fetchError } = await supabase
      .from('receipts')
      .select('path, mime')
      .eq('id', data.id)
      .maybeSingle()
    if (fetchError) throw fetchError

    const { error } = await supabase.from('receipts').delete().eq('id', data.id)
    if (error) throw error

    if (receipt && !receipt.mime?.startsWith('link/')) {
      await supabase.storage.from(RECEIPTS_BUCKET).remove([receipt.path])
    }

    return { ok: true }
  })

/** Retorna uma URL utilizável: a própria URL externa (links) ou uma URL assinada (arquivos no bucket). */
export const signedUrl = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { supabase } = await requireUser()

    const { data: receipt, error } = await supabase
      .from('receipts')
      .select('path, mime')
      .eq('id', data.id)
      .single()
    if (error) throw error

    if (receipt.mime?.startsWith('link/')) {
      return { url: receipt.path }
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(receipt.path, 60 * 10)
    if (signError) throw signError

    return { url: signed.signedUrl }
  })
