export interface ProductDef {
  key: string
  label: string
  cycleMonths: number | null
}

export const PRODUCTS: ProductDef[] = [
  { key: 'gestao-mensal', label: 'Gestão Mensal', cycleMonths: 1 },
  { key: 'gestao-3', label: 'Gestão 3 meses', cycleMonths: 3 },
  { key: 'gestao-6', label: 'Gestão 6 meses', cycleMonths: 6 },
  { key: 'mentoria-4', label: 'Mentoria 4 meses', cycleMonths: 4 },
  { key: 'mentoria-gestao', label: 'Mentoria + Gestão', cycleMonths: 3 },
  { key: 'street', label: 'Street', cycleMonths: 12 },
]

export const OTHER_PRODUCT_KEY = '__other__'

const PRODUCT_MAP = new Map(PRODUCTS.map((p) => [p.key, p]))

export function getProductDef(product: string | null): ProductDef | null {
  if (!product) return null
  return PRODUCT_MAP.get(product) ?? null
}

export function productLabel(product: string | null): string {
  if (!product) return 'Outro produto'
  return PRODUCT_MAP.get(product)?.label ?? product
}

export type CycleStatus = 'ativo' | 'encerrado' | 'sem-ciclo'

export interface CycleInfo {
  start: string | null
  end: string | null
  status: CycleStatus
}

function addMonths(dateIso: string, months: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

/**
 * Início do ciclo = data do primeiro pagamento (primeira parcela com data,
 * ordenada por data); se não houver parcela com data, usa a data da venda.
 */
export function getCycleFirstPaymentDate(
  saleDate: string,
  installments: Array<{ dueDate: string | null }>,
): string {
  const dated = installments
    .map((i) => i.dueDate)
    .filter((d): d is string => !!d)
    .sort()
  return dated[0] ?? saleDate
}

export function computeCycle(
  product: string | null,
  saleDate: string,
  installments: Array<{ dueDate: string | null }>,
  today: Date = new Date(),
): CycleInfo {
  const def = getProductDef(product)
  if (!def || def.cycleMonths == null) {
    return { start: null, end: null, status: 'sem-ciclo' }
  }

  const start = getCycleFirstPaymentDate(saleDate, installments)
  const end = addMonths(start, def.cycleMonths)
  const todayIso = today.toISOString().slice(0, 10)
  const status: CycleStatus = todayIso <= end ? 'ativo' : 'encerrado'
  return { start, end, status }
}
