import type { Database } from '#/lib/supabase/database.types'
import type { Installment, Receipt, Sale, SalesGoal, UserSettings } from '#/lib/types'

type SaleRow = Database['public']['Tables']['sales']['Row']
type InstallmentRow = Database['public']['Tables']['installments']['Row']
type ReceiptRow = Database['public']['Tables']['receipts']['Row']
type GoalRow = Database['public']['Tables']['sales_goals']['Row']
type SettingsRow = Database['public']['Tables']['user_settings']['Row']

export function mapInstallment(row: InstallmentRow): Installment {
  return {
    id: row.id,
    saleId: row.sale_id,
    value: Number(row.value),
    dueDate: row.due_date,
    received: row.received,
    position: row.position,
  }
}

export function mapReceipt(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    ownerId: row.owner_id,
    saleId: row.sale_id,
    installmentId: row.installment_id,
    path: row.path,
    filename: row.filename,
    mime: row.mime,
    size: row.size,
    createdAt: row.created_at,
  }
}

export function mapSale(
  row: SaleRow & { installments?: InstallmentRow[] | null; receipts?: ReceiptRow[] | null },
): Sale {
  return {
    id: row.id,
    ownerId: row.owner_id,
    date: row.date,
    leadName: row.lead_name,
    phone: row.phone,
    paymentMethod: row.payment_method,
    value: Number(row.value),
    product: row.product,
    leadSource: row.lead_source,
    isOpportunity: row.is_opportunity,
    contractSigned: row.contract_signed,
    paymentReceived: row.payment_received,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    installments: (row.installments ?? [])
      .map(mapInstallment)
      .sort((a, b) => a.position - b.position),
    receipts: (row.receipts ?? []).map(mapReceipt),
  }
}

export function mapGoal(row: GoalRow): SalesGoal {
  return {
    id: row.id,
    ownerId: row.owner_id,
    cycleStart: row.cycle_start,
    cycleEnd: row.cycle_end,
    goalAmount: Number(row.goal_amount),
    receivedOverride: row.received_override == null ? null : Number(row.received_override),
    soldOverride: row.sold_override == null ? null : Number(row.sold_override),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapSettings(row: SettingsRow): UserSettings {
  return {
    userId: row.user_id,
    baseSalary: Number(row.base_salary),
    shareEnabled: row.share_enabled,
    updatedAt: row.updated_at,
  }
}
