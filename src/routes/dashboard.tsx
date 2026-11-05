import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { requireAuthContext } from '#/lib/auth-guard'
import { listSales } from '#/server/sales'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { MetricsGrid  } from '#/components/metrics-grid'
import type {Metric} from '#/components/metrics-grid';
import { RevenueLineChart  } from '#/components/charts/revenue-line-chart'
import type {DailyPoint} from '#/components/charts/revenue-line-chart';
import { ProductDonutChart  } from '#/components/charts/product-donut-chart'
import type {ProductSlice} from '#/components/charts/product-donut-chart';
import { computePeriodTotals } from '#/lib/business/commission'
import { currentCycle, growthPercent, previousCycle } from '#/lib/business/cycle-period'
import { productLabel } from '#/lib/business/products'
import { formatCurrency, formatDate } from '#/lib/format'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireAuthContext,
  loader: async () => {
    const [sales, ctx] = await Promise.all([listSales(), requireAuthContext()])
    return { sales, ctx }
  },
  component: DashboardPage,
})

const MOTIVATIONAL = [
  'Cada "não" te deixa mais perto do próximo "sim".',
  'Foco no processo, o resultado é consequência.',
  'Closer bom não espera oportunidade, ele cria.',
  'Disciplina vence motivação — todos os dias.',
  'O ciclo recomeça, sua energia também.',
]

type Mode = 'atual' | 'anterior' | 'personalizado'

function enumerateDays(from: string, to: string): string[] {
  const days: string[] = []
  const cursor = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

function DashboardPage() {
  const { sales, ctx } = Route.useLoaderData()
  const [mode, setMode] = useState<Mode>('atual')
  const [customA, setCustomA] = useState({ start: currentCycle().start, end: currentCycle().end })
  const [customB, setCustomB] = useState({ start: previousCycle().start, end: previousCycle().end })

  const { cycleA, cycleB } = useMemo(() => {
    if (mode === 'atual') return { cycleA: currentCycle(), cycleB: previousCycle() }
    if (mode === 'anterior') {
      const prev = previousCycle()
      const prevOfPrev = previousCycle(new Date(`${prev.start}T00:00:00Z`))
      return { cycleA: prev, cycleB: prevOfPrev }
    }
    return { cycleA: customA, cycleB: customB }
  }, [mode, customA, customB])

  const greeting = getGreeting()
  const phrase = MOTIVATIONAL[new Date().getDate() % MOTIVATIONAL.length]

  const vendas = sales.filter((s) => !s.isOpportunity)
  const opportunities = sales.filter((s) => s.isOpportunity)

  const vendasNoCicloA = vendas.filter((s) => s.date >= cycleA.start && s.date <= cycleA.end)

  const totalsA = computePeriodTotals(sales, { from: cycleA.start, to: cycleA.end })
  const totalsB = computePeriodTotals(sales, { from: cycleB.start, to: cycleB.end })

  const faturamentoA = vendasNoCicloA.reduce((s, v) => s + v.value, 0)
  const ticketMedio = vendasNoCicloA.length > 0 ? faturamentoA / vendasNoCicloA.length : 0
  const clientesUnicos = new Set(vendasNoCicloA.map((v) => v.leadName)).size
  const oportunidadesValor = opportunities.reduce((s, v) => s + v.value, 0)

  const growth = growthPercent(totalsA.received, totalsB.received)

  const metrics: Metric[] = [
    { label: 'Faturamento', value: formatCurrency(faturamentoA) },
    { label: 'Nº de vendas', value: String(vendasNoCicloA.length) },
    { label: 'Ticket médio', value: formatCurrency(ticketMedio) },
    { label: 'Recebido', value: formatCurrency(totalsA.received), tone: 'positive' },
    { label: 'A receber', value: formatCurrency(totalsA.pendingReceivable), tone: 'negative' },
    { label: 'Total de clientes', value: String(clientesUnicos) },
    { label: 'Valor em oportunidades', value: formatCurrency(oportunidadesValor) },
  ]

  const dailyPoints: DailyPoint[] = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const day of enumerateDays(cycleA.start, cycleA.end)) byDay.set(day, 0)
    for (const sale of vendasNoCicloA) {
      byDay.set(sale.date, (byDay.get(sale.date) ?? 0) + sale.value)
    }
    return [...byDay.entries()].map(([date, value]) => ({ date, value }))
  }, [cycleA, vendasNoCicloA])

  const productSlices: ProductSlice[] = useMemo(() => {
    const byProduct = new Map<string, number>()
    for (const sale of vendasNoCicloA) {
      const label = productLabel(sale.product)
      byProduct.set(label, (byProduct.get(label) ?? 0) + sale.value)
    }
    return [...byProduct.entries()].map(([name, value]) => ({ name, value }))
  }, [vendasNoCicloA])

  const ranking = useMemo(() => {
    const byClient = new Map<string, number>()
    for (const sale of vendas) {
      byClient.set(sale.leadName, (byClient.get(sale.leadName) ?? 0) + sale.value)
    }
    return [...byClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [vendas])

  return (
    <main className="page-wrap flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {greeting}, {ctx.displayName ?? ctx.email.split('@')[0]}
        </h1>
        <p className="text-sm text-muted-foreground">{phrase}</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Comparar</label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atual">Ciclo Atual</SelectItem>
                <SelectItem value="anterior">Ciclo Anterior</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'personalizado' && (
            <>
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Ciclo A — início</label>
                  <Input
                    type="date"
                    value={customA.start}
                    onChange={(e) => setCustomA((c) => ({ ...c, start: e.target.value }))}
                    className="w-36"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">fim</label>
                  <Input
                    type="date"
                    value={customA.end}
                    onChange={(e) => setCustomA((c) => ({ ...c, end: e.target.value }))}
                    className="w-36"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Ciclo B — início</label>
                  <Input
                    type="date"
                    value={customB.start}
                    onChange={(e) => setCustomB((c) => ({ ...c, start: e.target.value }))}
                    className="w-36"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">fim</label>
                  <Input
                    type="date"
                    value={customB.end}
                    onChange={(e) => setCustomB((c) => ({ ...c, end: e.target.value }))}
                    className="w-36"
                  />
                </div>
              </div>
            </>
          )}

          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">
              {formatDate(cycleA.start)} – {formatDate(cycleA.end)} vs {formatDate(cycleB.start)} –{' '}
              {formatDate(cycleB.end)}
            </p>
            {growth !== null && (
              <p
                className={
                  'flex items-center justify-end gap-1 text-lg font-semibold ' +
                  (growth >= 0 ? 'text-[var(--delta-good)]' : 'text-amber-600 dark:text-amber-400')
                }
              >
                {growth >= 0 ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                {Math.abs(growth).toFixed(1)}%
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <MetricsGrid metrics={metrics} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueLineChart data={dailyPoints} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por produto</CardTitle>
          </CardHeader>
          <CardContent>
            {productSlices.length > 0 ? (
              <ProductDonutChart data={productSlices} />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">Sem vendas no período.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de clientes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {ranking.map(([name, total], index) => (
            <div key={name} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
              <span className="w-5 text-xs text-muted-foreground">{index + 1}</span>
              <span className="flex-1 truncate">{name}</span>
              <span className="font-medium tabular-nums">{formatCurrency(total)}</span>
            </div>
          ))}
          {ranking.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem histórico de vendas ainda.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}
