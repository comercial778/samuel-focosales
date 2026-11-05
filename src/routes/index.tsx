import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { FileCheck2, Plus, Target } from 'lucide-react'
import { requireAuthContext } from '#/lib/auth-guard'
import { listSales } from '#/server/sales'
import { getSettings } from '#/server/settings'
import { MetricsGrid  } from '#/components/metrics-grid'
import type {Metric} from '#/components/metrics-grid';
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { SaleFormDialog } from '#/components/sales/sale-form-dialog'
import { InstallmentList } from '#/components/sales/installment-list'
import { ReceiptButton } from '#/components/sales/receipt-button'
import { computePeriodTotals, totalToReceive } from '#/lib/business/commission'
import { productLabel } from '#/lib/business/products'
import { formatCurrency, formatDate } from '#/lib/format'
import type { Sale } from '#/lib/types'

export const Route = createFileRoute('/')({
  beforeLoad: requireAuthContext,
  loader: async () => {
    const [sales, settings] = await Promise.all([listSales(), getSettings()])
    return { sales, settings }
  },
  component: HomePage,
})

function HomePage() {
  const { sales, settings } = Route.useLoaderData()
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogIsOpportunity, setDialogIsOpportunity] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)

  function refresh() {
    router.invalidate()
  }

  function openNewSale() {
    setEditingSale(null)
    setDialogIsOpportunity(false)
    setDialogOpen(true)
  }

  function openNewOpportunity() {
    setEditingSale(null)
    setDialogIsOpportunity(true)
    setDialogOpen(true)
  }

  function openEdit(sale: Sale) {
    setEditingSale(sale)
    setDialogOpen(true)
  }

  const vendas = sales.filter((s) => !s.isOpportunity)
  const oportunidades = sales.filter((s) => s.isOpportunity)

  const totals = computePeriodTotals(sales, { from: null, to: null })
  const totalReceive = totalToReceive(settings.baseSalary, totals.commission)

  const metrics: Metric[] = [
    { label: 'Faturamento', value: formatCurrency(totals.contractedValue) },
    { label: 'Recebido', value: formatCurrency(totals.received), tone: 'positive' },
    { label: 'A receber', value: formatCurrency(totals.pendingReceivable), tone: 'negative' },
    { label: 'Comissão', value: formatCurrency(totals.commission) },
    { label: 'Salário', value: formatCurrency(settings.baseSalary) },
    { label: 'Total a receber', value: formatCurrency(totalReceive), tone: 'positive' },
    { label: 'Valor em oportunidades', value: formatCurrency(totals.opportunityValue) },
  ]

  return (
    <main className="page-wrap flex flex-col gap-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Início</h1>
          <p className="text-sm text-muted-foreground">Calculadora de vendas e comissão</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNewOpportunity}>
            <Target className="size-4" />
            Nova Oportunidade
          </Button>
          <Button onClick={openNewSale}>
            <Plus className="size-4" />
            Nova Venda
          </Button>
        </div>
      </div>

      <MetricsGrid metrics={metrics} />

      <Tabs defaultValue="vendas">
        <TabsList>
          <TabsTrigger value="vendas">Vendas ({vendas.length})</TabsTrigger>
          <TabsTrigger value="oportunidades">Oportunidades ({oportunidades.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="vendas" className="mt-4 flex flex-col gap-3">
          {vendas.map((sale) => (
            <SaleListItem key={sale.id} sale={sale} onEdit={openEdit} onChange={refresh} />
          ))}
          {vendas.length === 0 && <EmptyState label="Nenhuma venda cadastrada ainda." />}
        </TabsContent>
        <TabsContent value="oportunidades" className="mt-4 flex flex-col gap-3">
          {oportunidades.map((sale) => (
            <SaleListItem key={sale.id} sale={sale} onEdit={openEdit} onChange={refresh} />
          ))}
          {oportunidades.length === 0 && <EmptyState label="Nenhuma oportunidade em aberto." />}
        </TabsContent>
      </Tabs>

      <SaleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sale={editingSale}
        defaultIsOpportunity={dialogIsOpportunity}
        onSaved={() => {
          toast.success('Salvo com sucesso')
          refresh()
        }}
      />
    </main>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  )
}

function SaleListItem({
  sale,
  onEdit,
  onChange,
}: {
  sale: Sale
  onEdit: (sale: Sale) => void
  onChange: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const contractReceipts = sale.receipts.filter((r) => r.installmentId === null)

  return (
    <Card>
      <CardContent className="p-4">
        <button
          type="button"
          className="flex w-full flex-wrap items-center gap-3 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{sale.leadName}</p>
              {sale.contractSigned && <FileCheck2 className="size-4 shrink-0 text-emerald-600" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {productLabel(sale.product)} · {formatDate(sale.date)} · {sale.paymentMethod}
            </p>
          </div>
          <span className="font-semibold tabular-nums">{formatCurrency(sale.value)}</span>
          <Badge variant={sale.paymentReceived ? 'success' : 'outline'}>
            {sale.paymentReceived ? 'Pago à vista' : `${sale.installments.length} parcela(s)`}
          </Badge>
        </button>

        {expanded && (
          <div className="mt-3 flex flex-col gap-3 border-t pt-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onEdit(sale)}>
                Editar venda
              </Button>
              <ReceiptButton
                saleId={sale.id}
                installmentId={null}
                receipts={contractReceipts}
                label="Contrato"
                onChange={onChange}
              />
            </div>
            <InstallmentList
              saleId={sale.id}
              installments={sale.installments}
              receipts={sale.receipts}
              onChange={onChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
