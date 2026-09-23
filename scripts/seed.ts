/**
 * Importa os dados reais exportados do FocoSales (supabase/seed-data/focosales-dados.sql)
 * para um projeto Supabase novo.
 *
 * Como os usuários originais não podem ser recriados com os mesmos IDs (o Supabase
 * Auth gera seus próprios), este script cria uma conta para cada perfil exportado
 * via Admin API, monta um mapa id-antigo -> id-novo, e usa esse mapa para remapear
 * todas as referências (owner_id, user_id) ao inserir o restante dos dados.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... VITE_SUPABASE_URL=... npx tsx scripts/seed.ts
 */
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { parseInserts, rowsFor  } from './sql-values-parser'
import type {SqlValue} from './sql-values-parser';

config()

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (.env ou variáveis de ambiente).')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dumpPath = path.join(__dirname, '..', 'supabase', 'seed-data', 'focosales-dados.sql')
const sql = readFileSync(dumpPath, 'utf-8')
const inserts = parseInserts(sql)

function str(v: SqlValue): string {
  return v == null ? '' : String(v)
}
function strOrNull(v: SqlValue): string | null {
  return v == null ? null : String(v)
}
function num(v: SqlValue): number {
  return Number(v)
}
function bool(v: SqlValue): boolean {
  return Boolean(v)
}

async function findExistingUserIdByEmail(email: string): Promise<string | null> {
  let page = 1
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found) return found.id
    if (data.users.length < 200) return null
    page++
  }
}

async function main() {
  const profileRows = rowsFor(inserts, 'profiles')
  const settingsRows = rowsFor(inserts, 'user_settings')
  const salesRows = rowsFor(inserts, 'sales')
  const installmentRows = rowsFor(inserts, 'installments')
  const receiptRows = rowsFor(inserts, 'receipts')
  const goalRows = rowsFor(inserts, 'sales_goals')
  const shareRows = rowsFor(inserts, 'dashboard_shares')

  console.log(
    `Encontrados: ${profileRows.length} perfis, ${salesRows.length} vendas, ${installmentRows.length} parcelas, ${receiptRows.length} comprovantes, ${goalRows.length} metas, ${shareRows.length} compartilhamentos legados.`,
  )

  const idMap = new Map<string, string>()

  for (const row of profileRows) {
    const oldId = str(row.id)
    const email = str(row.email)
    const displayName = strOrNull(row.display_name)

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { display_name: displayName },
    })

    if (error) {
      const existingId = await findExistingUserIdByEmail(email)
      if (!existingId) throw new Error(`Falha ao criar/encontrar usuário ${email}: ${error.message}`)
      idMap.set(oldId, existingId)
      console.log(`Usuário já existia: ${email} -> ${existingId}`)
      continue
    }

    idMap.set(oldId, data.user.id)
    console.log(`Usuário criado: ${email} -> ${data.user.id}`)
  }

  for (const row of settingsRows) {
    const newUserId = idMap.get(str(row.user_id))
    if (!newUserId) continue
    const { error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: newUserId,
          base_salary: num(row.base_salary),
          share_enabled: bool(row.share_enabled),
        },
        { onConflict: 'user_id' },
      )
    if (error) throw error
  }
  console.log(`user_settings: ${settingsRows.length} atualizados.`)

  if (salesRows.length > 0) {
    const payload = salesRows.map((row) => ({
      id: str(row.id),
      owner_id: idMap.get(str(row.owner_id)) ?? str(row.owner_id),
      date: str(row.date),
      lead_name: str(row.lead_name),
      phone: strOrNull(row.phone),
      payment_method: str(row.payment_method),
      value: num(row.value),
      product: strOrNull(row.product),
      lead_source: strOrNull(row.lead_source),
      is_opportunity: bool(row.is_opportunity),
      contract_signed: bool(row.contract_signed),
      payment_received: bool(row.payment_received),
      created_at: str(row.created_at),
      updated_at: str(row.updated_at),
    }))
    const { error } = await supabase.from('sales').upsert(payload, { onConflict: 'id' })
    if (error) throw error
    console.log(`sales: ${payload.length} inseridas.`)
  }

  if (installmentRows.length > 0) {
    const payload = installmentRows.map((row) => ({
      id: str(row.id),
      sale_id: str(row.sale_id),
      value: num(row.value),
      due_date: strOrNull(row.due_date),
      received: bool(row.received),
      position: num(row.position),
    }))
    const { error } = await supabase.from('installments').upsert(payload, { onConflict: 'id' })
    if (error) throw error
    console.log(`installments: ${payload.length} inseridas.`)
  }

  if (receiptRows.length > 0) {
    const payload = receiptRows.map((row) => ({
      id: str(row.id),
      owner_id: idMap.get(str(row.owner_id)) ?? str(row.owner_id),
      sale_id: str(row.sale_id),
      installment_id: strOrNull(row.installment_id),
      path: str(row.path),
      filename: str(row.filename),
      mime: strOrNull(row.mime),
      size: row.size == null ? null : num(row.size),
      created_at: str(row.created_at),
    }))
    const { error } = await supabase.from('receipts').upsert(payload, { onConflict: 'id' })
    if (error) throw error
    console.log(`receipts: ${payload.length} inseridos.`)
  }

  if (goalRows.length > 0) {
    const payload = goalRows.map((row) => ({
      id: str(row.id),
      owner_id: idMap.get(str(row.owner_id)) ?? str(row.owner_id),
      cycle_start: str(row.cycle_start),
      cycle_end: str(row.cycle_end),
      goal_amount: num(row.goal_amount),
      received_override: row.received_override == null ? null : num(row.received_override),
      sold_override: row.sold_override == null ? null : num(row.sold_override),
      created_at: str(row.created_at),
      updated_at: str(row.updated_at),
    }))
    const { error } = await supabase.from('sales_goals').upsert(payload, { onConflict: 'id' })
    if (error) throw error
    console.log(`sales_goals: ${payload.length} inseridas.`)
  }

  if (shareRows.length > 0) {
    const payload = shareRows.map((row) => ({
      id: str(row.id),
      owner_id: idMap.get(str(row.owner_id)) ?? str(row.owner_id),
      email: str(row.email),
      user_id: row.user_id == null ? null : (idMap.get(str(row.user_id)) ?? str(row.user_id)),
      created_at: str(row.created_at),
    }))
    const { error } = await supabase.from('dashboard_shares').upsert(payload, { onConflict: 'id' })
    if (error) throw error
    console.log(`dashboard_shares: ${payload.length} inseridos.`)
  }

  console.log('Seed concluído com sucesso.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
