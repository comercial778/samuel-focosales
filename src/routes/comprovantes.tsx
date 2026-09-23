import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Download, FileCheck2, Pencil, Plus } from 'lucide-react'
import { requireAuthContext } from '#/lib/auth-guard'
import { listSales, upsertSale  } from '#/server/sales'
import { getSettings } from '#/server/settings'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { SaleFormDialog } from '#/components/sales/sale-form-dialog'
import { InstallmentList } from '#/components/sales/installment-list'
import { ReceiptButton } from '#/components/sales/receipt-button'
import { MetricsGrid  } from '#/components/metrics-grid'
import type {Metric} from '#/components/metrics-grid';
import { computePeriodTotals, totalFutureOfCycle, totalToReceive } from '#/lib/business/commission'
import { computeCycle, getCycleFirstPaymentDate, PRODUCTS, productLabel  } from '#/lib/business/products'
import type {CycleStatus} from '#/lib/business/products';
import { saleToInput } from '#/lib/business/sale-input'
import { exportSalesCsv } from '#/lib/export-csv'
import { formatCurrency, formatDate } from '#/lib/format'
import type { Sale } from '#/lib/types'

export const Route = createFileRoute('/comprovantes')({
  beforeLoad: requireAuthContext,
  loader: async () => {
    const [sales, settings] = await Promise.all([listSales(), getSettings()])
    return { sales, settings }
  },
  component: ComprovantesPage,
})

const STATUS_LABEL: Record<CycleStatus, string> = {
  ativo: 'Ativo',
  encerrado: 'Encerrado',
  'sem-ciclo': 'Sem ciclo',
}

function ComprovantesPage() {
  const { sales, settings } = Route.useLoaderData()
  const router = useRouter()

  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)

  function refresh() {
    router.invalidate()
  }

  const clients = sales.filter((s) => !s.isOpportunity)

  const filtered = useMemo(() => {
    return clients.filter((sale) => {
      if (search && !sale.leadName.toLowerCase().includes(search.toLowerCase())) return false
      if (productFilter !== 'todos' && sale.product !== productFilter) return false

      const cycle = computeCycle(sale.product, sale.date, sale.installments)
      if (statusFilter !== 'todos' && cycle.status !== statusFilter) return false

      if (from || to) {
        const hasInPeriod = sale.installments.some((i) => {
          if (!i.dueDate) return false
          if (from && i.dueDate < from) return false
          if (to && i.dueDate > to) return false
          return true
        })
        if (!hasInPeriod) return false
      }

      return true
    })
  }, [clients, search, productFilter, statusFilter, from, to])

  const period = { from: from || null, to: to || null }
  const totals = computePeriodTotals(filtered, period)
  const totalReceive = totalToReceive(settings.baseSalary, totals.commission)
  const totalFuture = totalFutureOfCycle(settings.baseSalary, totals.commission, totals.pendingCommission)
  const oportunidades = sales.filter((s) => s.isOpportunity)
  const oportunidadesValor = oportunidades.reduce((sum, s) => sum + s.value, 0)
  const pendingCount = filtered.reduce(
    (sum, s) =>
      sum +
      s.installments.filter((i) => {
        if (i.received) return false
        if (!i.dueDate) return !from && !to
        if (from && i.dueDate < from) return false
        if (to && i.dueDate > to) return false
        return true
      }).length,
    0,
  )

  const metrics: Metric[] = [
    { label: 'Total Vendas', value: formatCurrency(totals.contractedValue) },
    { label: 'Recebido', value: formatCurrency(totals.received), tone: 'positive' },
    { label: 'A Receber', value: formatCurrency(totals.pendingReceivable), tone: 'negative' },
    { label: 'Comissão Recebida', value: formatCurrency(totals.commission), tone: 'positive' },
    { label: 'Comissão a Receber', value: formatCurrency(totals.pendingCommission), tone: 'negative' },
    { label: 'Salário Base', value: formatCurrency(settings.baseSalary) },
    { label: 'Total a Receber', value: formatCurrency(totalReceive), tone: 'positive' },
    { label: 'Total Futuro a Receber no Final do Ciclo', value: formatCurrency(totalFuture), tone: 'positive' },
    { label: 'Vendas', value: String(totals.salesCount) },
    { label: 'Valor de Oportunidades', value: formatCurrency(oportunidadesValor) },
    { label: 'Oportunidades', value: String(oportunidades.length) },
    { label: 'Pagamentos a Receber', value: String(pendingCount) },
  ]

  function handleExport() {
    const { totalValor, totalComissao } = exportSalesCsv(filtered)
    toast.success('Planilha exportada', { description: `Total: ${totalValor} · Comissão: ${totalComissao}` })
  }

  async function renameSale(sale: Sale, newName: string) {
    if (!newName.trim() || newName === sale.leadName) return
    try {
      await upsertSale({ data: { id: sale.id, sale: { ...saleToInput(sale), leadName: newName.trim() } } })
      refresh()
    } catch (err) {
      toast.error('Erro ao renomear', { description: (err as Error).message })
    }
  }

  return (
    <main className="page-wrap flex flex-col gap-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Todos os Clientes</h1>
          <p className="text-sm text-muted-foreground">Ficha de cada cliente, ciclo, parcelas e comprovantes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="size-4" />
            Exportar CSV
          </Button>
          <Button
            onClick={() => {
              setEditingSale(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" />
            Adicionar Nova Venda
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex min-w-40 flex-1 flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Buscar</label>
            <Input placeholder="Nome do cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Produto</label>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {PRODUCTS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status do ciclo</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
                <SelectItem value="sem-ciclo">Sem ciclo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">De</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Até</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
        </CardContent>
      </Card>

      <MetricsGrid metrics={metrics} />

      <div className="flex flex-col gap-3">
        {filtered.map((sale) => (
          <ClientCard
            key={sale.id}
            sale={sale}
            onEdit={(s) => {
              setEditingSale(s)
              setDialogOpen(true)
            }}
            onRename={renameSale}
            onChange={refresh}
          />
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado com os filtros atuais.
            </CardContent>
          </Card>
        )}
      </div>

      <SaleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sale={editingSale}
        onSaved={() => {
          toast.success('Salvo com sucesso')
          refresh()
        }}
      />
    </main>
  )
}

function ClientCard({
  sale,
  onEdit,
  onRename,
  onChange,
}: {
  sale: Sale
  onEdit: (sale: Sale) => void
  onRename: (sale: Sale, name: string) => void
  onChange: () => void
}) {
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(sale.leadName)

  const cycle = computeCycle(sale.product, sale.date, sale.installments)
  const firstPayment = getCycleFirstPaymentDate(sale.date, sale.installments)
  const contractReceipts = sale.receipts.filter((r) => r.installmentId === null)

  const statusVariant = cycle.status === 'ativo' ? 'success' : cycle.status === 'encerrado' ? 'outline' : 'secondary'

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {editingName ? (
                <Input
                  autoFocus
                  className="h-7 w-48"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={() => {
                    setEditingName(false)
                    onRename(sale, nameDraft)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-1.5 font-medium hover:underline"
                  onClick={() => {
                    setNameDraft(sale.leadName)
                    setEditingName(true)
                  }}
                >
                  {sale.leadName}
                  <Pencil className="size-3 text-muted-foreground" />
                </button>
              )}
              <ReceiptButton
                saleId={sale.id}
                installmentId={null}
                receipts={contractReceipts}
                label="Contrato"
                onChange={onChange}
              />
              {contractReceipts.length > 0 && <FileCheck2 className="size-4 text-emerald-600" />}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{productLabel(sale.product)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Entrada</p>
              <p className="font-medium">{formatDate(sale.date)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">1º pagamento</p>
              <p className="font-medium">{formatDate(firstPayment)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Término do ciclo</p>
              <p className="font-medium">{formatDate(cycle.end)}</p>
            </div>
            <Badge variant={statusVariant}>{STATUS_LABEL[cycle.status]}</Badge>
          </div>

          <Button variant="outline" size="sm" onClick={() => onEdit(sale)}>
            <Pencil className="size-3.5" />
            Editar
          </Button>
        </div>

        <InstallmentList
          saleId={sale.id}
          installments={sale.installments}
          receipts={sale.receipts}
          onChange={onChange}
        />
      </CardContent>
    </Card>
  )
}
