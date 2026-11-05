import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireUser } from '#/server/context'
import { mapSale } from '#/server/mappers'
import type { Sale } from '#/lib/types'

const SALE_SELECT = '*, installments(*), receipts(*)'

export const listSales = createServerFn({ method: 'GET' }).handler(async (): Promise<Sale[]> => {
  const { supabase } = await requireUser()

  const { data, error } = await supabase
    .from('sales')
    .select(SALE_SELECT)
    .order('date', { ascending: false })

  if (error) throw error
  return data.map(mapSale)
})

const installmentInputSchema = z.object({
  id: z.string().uuid().optional(),
  value: z.number().min(0),
  dueDate: z.string().nullable(),
  received: z.boolean(),
})

const saleInputSchema = z.object({
  date: z.string(),
  leadName: z.string().min(1),
  phone: z.string().nullable(),
  paymentMethod: z.enum(['PIX', 'Pix Parcelado', 'Cartão']),
  value: z.number().min(0),
  product: z.string().nullable(),
  leadSource: z.string().nullable(),
  isOpportunity: z.boolean(),
  contractSigned: z.boolean(),
  paymentReceived: z.boolean(),
  installments: z.array(installmentInputSchema),
})

/**
 * Cria ou edita uma venda/oportunidade. Diferente da versão anterior do sistema
 * (que apagava e recriava todas as parcelas a cada edição, perdendo comprovantes
 * ligados a installment_id), aqui as parcelas existentes são atualizadas por id,
 * as novas são inseridas e apenas as removidas pelo usuário são excluídas.
 */
export const upsertSale = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid().optional(), sale: saleInputSchema }))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { supabase, user } = await requireUser()
    const { sale } = data

    const saleRow = {
      owner_id: user.id,
      date: sale.date,
      lead_name: sale.leadName,
      phone: sale.phone,
      payment_method: sale.paymentMethod,
      value: sale.value,
      product: sale.product,
      lead_source: sale.leadSource,
      is_opportunity: sale.isOpportunity,
      contract_signed: sale.contractSigned,
      payment_received: sale.paymentReceived,
    }

    let saleId = data.id

    if (saleId) {
      const { error } = await supabase.from('sales').update(saleRow).eq('id', saleId)
      if (error) throw error
    } else {
      const { data: inserted, error } = await supabase
        .from('sales')
        .insert(saleRow)
        .select('id')
        .single()
      if (error) throw error
      saleId = inserted.id
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('installments')
      .select('id')
      .eq('sale_id', saleId)
    if (existingError) throw existingError

    const existingIds = new Set(existingRows.map((r) => r.id))
    const keptIds = new Set(sale.installments.filter((i) => i.id).map((i) => i.id!))
    const toDelete = [...existingIds].filter((id) => !keptIds.has(id))

    if (toDelete.length > 0) {
      const { error } = await supabase.from('installments').delete().in('id', toDelete)
      if (error) throw error
    }

    for (const [index, installment] of sale.installments.entries()) {
      const row = {
        sale_id: saleId,
        value: installment.value,
        due_date: installment.dueDate,
        received: installment.received,
        position: index,
      }

      if (installment.id && existingIds.has(installment.id)) {
        const { error } = await supabase
          .from('installments')
          .update(row)
          .eq('id', installment.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('installments').insert(row)
        if (error) throw error
      }
    }

    return { id: saleId }
  })

export const deleteSale = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const { error } = await supabase.from('sales').delete().eq('id', data.id)
    if (error) throw error
    return { ok: true }
  })

export const toggleInstallmentReceived = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid(), received: z.boolean() }))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const { error } = await supabase
      .from('installments')
      .update({ received: data.received })
      .eq('id', data.id)
    if (error) throw error
    return { ok: true }
  })

export const addInstallment = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      saleId: z.string().uuid(),
      value: z.number().min(0),
      dueDate: z.string().nullable(),
      received: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()

    const { count } = await supabase
      .from('installments')
      .select('id', { count: 'exact', head: true })
      .eq('sale_id', data.saleId)

    const { error } = await supabase.from('installments').insert({
      sale_id: data.saleId,
      value: data.value,
      due_date: data.dueDate,
      received: data.received,
      position: count ?? 0,
    })
    if (error) throw error
    return { ok: true }
  })

export const updateInstallment = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().uuid(),
      value: z.number().min(0),
      dueDate: z.string().nullable(),
      received: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const { error } = await supabase
      .from('installments')
      .update({ value: data.value, due_date: data.dueDate, received: data.received })
      .eq('id', data.id)
    if (error) throw error
    return { ok: true }
  })

export const deleteInstallment = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabase } = await requireUser()
    const { error } = await supabase.from('installments').delete().eq('id', data.id)
    if (error) throw error
    return { ok: true }
  })
