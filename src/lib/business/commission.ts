import type { Installment, PaymentMethod, Sale } from '#/lib/types'

export const COMMISSION_RATES: Record<PaymentMethod, number> = {
  PIX: 0.09,
  'Pix Parcelado': 0.06,
  Cartão: 0.06,
}

export function commissionRate(paymentMethod: PaymentMethod): number {
  return COMMISSION_RATES[paymentMethod]
}

function inPeriod(dueDate: string | null, from: string | null, to: string | null): boolean {
  if (!dueDate) return false
  if (from && dueDate < from) return false
  if (to && dueDate > to) return false
  return true
}

export interface PeriodFilter {
  from: string | null
  to: string | null
}

/** Soma das parcelas RECEBIDAS de uma venda dentro do período (filtro pela due_date). */
export function receivedInPeriod(installments: Installment[], period: PeriodFilter): number {
  return installments
    .filter((i) => i.received && inPeriod(i.dueDate, period.from, period.to))
    .reduce((sum, i) => sum + i.value, 0)
}

/** Soma das parcelas pendentes (não recebidas) dentro do período. */
export function pendingInPeriod(installments: Installment[], period: PeriodFilter): number {
  return installments
    .filter((i) => !i.received && inPeriod(i.dueDate, period.from, period.to))
    .reduce((sum, i) => sum + i.value, 0)
}

/** comissão = soma das parcelas recebidas no período × taxa da venda. Oportunidades nunca entram. */
export function saleCommission(sale: Sale, period: PeriodFilter): number {
  if (sale.isOpportunity) return 0
  const received = receivedInPeriod(sale.installments, period)
  return received * commissionRate(sale.paymentMethod)
}

export function salePendingCommission(sale: Sale, period: PeriodFilter): number {
  if (sale.isOpportunity) return 0
  const pending = pendingInPeriod(sale.installments, period)
  return pending * commissionRate(sale.paymentMethod)
}

export interface PeriodTotals {
  received: number
  pendingReceivable: number
  commission: number
  pendingCommission: number
  contractedValue: number
  opportunityValue: number
  salesCount: number
}

export function computePeriodTotals(sales: Sale[], period: PeriodFilter): PeriodTotals {
  const totals: PeriodTotals = {
    received: 0,
    pendingReceivable: 0,
    commission: 0,
    pendingCommission: 0,
    contractedValue: 0,
    opportunityValue: 0,
    salesCount: 0,
  }

  for (const sale of sales) {
    if (sale.isOpportunity) {
      totals.opportunityValue += sale.value
      continue
    }
    totals.salesCount += 1
    totals.contractedValue += sale.value
    totals.received += receivedInPeriod(sale.installments, period)
    totals.pendingReceivable += pendingInPeriod(sale.installments, period)
    totals.commission += saleCommission(sale, period)
    totals.pendingCommission += salePendingCommission(sale, period)
  }

  return totals
}

/** Total a receber = salário base + comissão das parcelas recebidas no período. */
export function totalToReceive(baseSalary: number, commission: number): number {
  return baseSalary + commission
}

/** Total futuro do ciclo = comissão recebida + comissão pendente do ciclo + salário base. */
export function totalFutureOfCycle(
  baseSalary: number,
  commissionReceived: number,
  commissionPending: number,
): number {
  return baseSalary + commissionReceived + commissionPending
}
