import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { requireAuthContext } from '#/lib/auth-guard'
import { listGoals, upsertGoal } from '#/server/goals'
import { listSales } from '#/server/sales'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { computePeriodTotals } from '#/lib/business/commission'
import { currentCycle } from '#/lib/business/cycle-period'
import { formatCurrency, formatDate } from '#/lib/format'
import type { Sale, SalesGoal } from '#/lib/types'

export const Route = createFileRoute('/metas')({
  beforeLoad: requireAuthContext,
  loader: async () => {
    const [goals, sales] = await Promise.all([listGoals(), listSales()])
    return { goals, sales }
  },
  component: MetasPage,
})

function MetasPage() {
  const { goals, sales } = Route.useLoaderData()
  const router = useRouter()

  function refresh() {
    router.invalidate()
  }

  async function addCycle() {
    const cycle = currentCycle()
    if (goals.some((g) => g.cycleStart === cycle.start && g.cycleEnd === cycle.end)) {
      toast.info('O ciclo atual já está cadastrado')
      return
    }
    try {
      await upsertGoal({ data: { cycleStart: cycle.start, cycleEnd: cycle.end, goalAmount: 50000 } })
      refresh()
    } catch (err) {
      toast.error('Erro ao criar ciclo', { description: (err as Error).message })
    }
  }

  return (
    <main className="page-wrap flex flex-col gap-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Metas</h1>
          <p className="text-sm text-muted-foreground">Meta de recebimento e de vendas por ciclo (25 a 25)</p>
        </div>
        <Button onClick={addCycle}>
          <Plus className="size-4" />
          Novo ciclo
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} sales={sales} onSaved={refresh} />
        ))}
        {goals.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum ciclo cadastrado ainda.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function GoalCard({ goal, sales, onSaved }: { goal: SalesGoal; sales: Sale[]; onSaved: () => void }) {
  const [goalAmount, setGoalAmount] = useState(goal.goalAmount)
  const [receivedOverride, setReceivedOverride] = useState(goal.receivedOverride ?? '')
  const [soldOverride, setSoldOverride] = useState(goal.soldOverride ?? '')
  const [saving, setSaving] = useState(false)

  const period = { from: goal.cycleStart, to: goal.cycleEnd }
  const totals = computePeriodTotals(sales, period)
  const soldActual = sales
    .filter((s) => !s.isOpportunity && s.date >= goal.cycleStart && s.date <= goal.cycleEnd)
    .reduce((sum, s) => sum + s.value, 0)

  const receivedFinal = receivedOverride === '' ? totals.received : Number(receivedOverride)
  const soldFinal = soldOverride === '' ? soldActual : Number(soldOverride)
  const progress = goalAmount > 0 ? Math.min(100, (receivedFinal / goalAmount) * 100) : 0

  async function save() {
    setSaving(true)
    try {
      await upsertGoal({
        data: {
          id: goal.id,
          cycleStart: goal.cycleStart,
          cycleEnd: goal.cycleEnd,
          goalAmount,
          receivedOverride: receivedOverride === '' ? null : Number(receivedOverride),
          soldOverride: soldOverride === '' ? null : Number(soldOverride),
        },
      })
      toast.success('Meta salva')
      onSaved()
    } catch (err) {
      toast.error('Erro ao salvar meta', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">
            {formatDate(goal.cycleStart)} – {formatDate(goal.cycleEnd)}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(receivedFinal)} de {formatCurrency(goalAmount)} ({progress.toFixed(0)}%)
          </p>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Meta de recebimento</Label>
            <Input
              type="number"
              step="0.01"
              value={goalAmount}
              onChange={(e) => setGoalAmount(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Recebido (override)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder={formatCurrency(totals.received)}
              value={receivedOverride}
              onChange={(e) => setReceivedOverride(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Vendido (override)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder={formatCurrency(soldActual)}
              value={soldOverride}
              onChange={(e) => setSoldOverride(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Total vendido no ciclo: {formatCurrency(soldFinal)}</p>
          <Button size="sm" disabled={saving} onClick={save}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
