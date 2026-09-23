/** Ciclo financeiro padrão da empresa: dia 25 a 25. */

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Ciclo atual (25→25) com base na data de hoje. */
export function currentCycle(today: Date = new Date()): { start: string; end: string } {
  const y = today.getUTCFullYear()
  const m = today.getUTCMonth()
  const day = today.getUTCDate()

  let start: Date
  if (day >= 25) {
    start = new Date(Date.UTC(y, m, 25))
  } else {
    start = new Date(Date.UTC(y, m - 1, 25))
  }
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 24))
  return { start: toIso(start), end: toIso(end) }
}

export function previousCycle(today: Date = new Date()): { start: string; end: string } {
  const { start } = currentCycle(today)
  const s = new Date(`${start}T00:00:00Z`)
  const prevStart = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() - 1, 25))
  const prevEnd = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 24))
  return { start: toIso(prevStart), end: toIso(prevEnd) }
}

export function growthPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / previous) * 100
}
