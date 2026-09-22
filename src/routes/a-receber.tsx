import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { requireAuthContext } from '#/lib/auth-guard'
import { listSales } from '#/server/sales'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { InstallmentList } from '#/components/sales/installment-list'
import { productLabel } from '#/lib/business/products'
import { daysUntil, formatCurrency, formatDate, whatsappLink } from '#/lib/format'
import type { Installment, Sale } from '#/lib/types'

export const Route = createFileRoute('/a-receber')({
  beforeLoad: requireAuthContext,
  loader: async () => ({ sales: await listSales() }),
  component: AReceberPage,
})

function AReceberPage() {
  const { sales } = Route.useLoaderData()
  const router = useRouter()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  function refresh() {
    router.invalidate()
  }

  const clientsWithPending = useMemo(() => {
    return sales
      .filter((s) => !s.isOpportunity)
      .map((sale) => {
        const pending = sale.installments.filter((i) => {
          if (i.received) return false
          if (!i.dueDate) return true
          if (from && i.dueDate < from) return false
          if (to && i.dueDate > to) return false
          return true
        })
        return { sale, pending }
      })
      .filter((entry) => entry.pending.length > 0)
      .sort((a, b) => {
        const da = a.pending[0]?.dueDate ?? ''
        const db = b.pending[0]?.dueDate ?? ''
        return da.localeCompare(db)
      })
  }, [sales, from, to])

  const totalPending = clientsWithPending.reduce(
    (sum, { pending }) => sum + pending.reduce((s, i) => s + i.value, 0),
    0,
  )

  return (
    <main className="page-wrap flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Clientes a Receber</h1>
        <p className="text-sm text-muted-foreground">Parcelas pendentes agrupadas por cliente</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">De</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Até</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Total pendente</p>
            <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(totalPending)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {clientsWithPending.map(({ sale, pending }) => (
          <ClientPendingCard key={sale.id} sale={sale} pending={pending} onChange={refresh} />
        ))}
        {clientsWithPending.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma parcela pendente no período selecionado.
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function ClientPendingCard({
  sale,
  pending,
  onChange,
}: {
  sale: Sale
  pending: Installment[]
  onChange: () => void
}) {
  const wa = whatsappLink(sale.phone)
  const hasOverdue = pending.some((i) => i.dueDate && daysUntil(i.dueDate) < 0)
  const total = pending.reduce((sum, i) => sum + i.value, 0)

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{sale.leadName}</p>
              {hasOverdue && <Badge variant="destructive">Atrasado</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {productLabel(sale.product)} · {formatDate(sale.date)} · {sale.leadSource ?? '—'} ·{' '}
              {sale.paymentMethod} · Total: {formatCurrency(sale.value)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums">{formatCurrency(total)}</span>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                <MessageCircle className="size-3.5" />
                WhatsApp
              </a>
            )}
          </div>
        </div>

        <InstallmentList saleId={sale.id} installments={pending} receipts={sale.receipts} onChange={onChange} />
      </CardContent>
    </Card>
  )
}
