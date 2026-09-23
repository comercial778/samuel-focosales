import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { InstallmentsEditor } from './installments-editor'
import { OTHER_PRODUCT_KEY, PRODUCTS } from '#/lib/business/products'
import { todayIso } from '#/lib/format'
import { upsertSale } from '#/server/sales'
import type { Sale, SaleInput, SaleInstallmentInput } from '#/lib/types'

const LEAD_SOURCES = [
  { value: 'trafego', label: 'Tráfego pago' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'will', label: 'Will' },
  { value: 'outro', label: 'Outro' },
]

interface SaleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale?: Sale | null
  defaultIsOpportunity?: boolean
  onSaved: () => void
}

function buildInitialState(sale: Sale | null | undefined, defaultIsOpportunity: boolean): SaleInput {
  if (sale) {
    return {
      date: sale.date,
      leadName: sale.leadName,
      phone: sale.phone,
      paymentMethod: sale.paymentMethod,
      value: sale.value,
      product: sale.product,
      leadSource: sale.leadSource,
      isOpportunity: sale.isOpportunity,
      contractSigned: sale.contractSigned,
      paymentReceived: sale.paymentReceived,
      installments: sale.installments.map((i) => ({
        id: i.id,
        value: i.value,
        dueDate: i.dueDate,
        received: i.received,
      })),
    }
  }

  return {
    date: todayIso(),
    leadName: '',
    phone: '',
    paymentMethod: 'PIX',
    value: 0,
    product: null,
    leadSource: null,
    isOpportunity: defaultIsOpportunity,
    contractSigned: false,
    paymentReceived: false,
    installments: [],
  }
}

export function SaleFormDialog({
  open,
  onOpenChange,
  sale,
  defaultIsOpportunity = false,
  onSaved,
}: SaleFormDialogProps) {
  const [form, setForm] = useState<SaleInput>(() => buildInitialState(sale, defaultIsOpportunity))
  const [customProduct, setCustomProduct] = useState(() =>
    sale?.product && !PRODUCTS.some((p) => p.key === sale.product) ? sale.product : '',
  )
  const [saving, setSaving] = useState(false)

  const isEditing = !!sale
  const isOtherProduct = customProduct !== '' || (form.product != null && !PRODUCTS.some((p) => p.key === form.product))

  function resetFor(nextSale: Sale | null | undefined, nextDefaultOpportunity: boolean) {
    setForm(buildInitialState(nextSale, nextDefaultOpportunity))
    setCustomProduct(
      nextSale?.product && !PRODUCTS.some((p) => p.key === nextSale.product) ? nextSale.product : '',
    )
  }

  function handleOpenChange(next: boolean) {
    if (next) resetFor(sale, defaultIsOpportunity)
    onOpenChange(next)
  }

  function updateInstallments(installments: SaleInstallmentInput[]) {
    setForm((f) => ({ ...f, installments }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.leadName.trim()) {
      toast.error('Informe o nome do cliente')
      return
    }

    const product = isOtherProduct ? customProduct.trim() || null : form.product

    setSaving(true)
    try {
      await upsertSale({ data: { id: sale?.id, sale: { ...form, product } } })
      toast.success(isEditing ? 'Venda atualizada' : form.isOpportunity ? 'Oportunidade criada' : 'Venda criada')
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast.error('Não foi possível salvar', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar venda' : form.isOpportunity ? 'Nova oportunidade' : 'Nova venda'}
          </DialogTitle>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leadName">Nome do cliente</Label>
              <Input
                id="leadName"
                value={form.leadName}
                onChange={(e) => setForm((f) => ({ ...f, leadName: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value || null }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Origem do lead</Label>
              <Select
                value={form.leadSource ?? undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, leadSource: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Produto</Label>
              <Select
                value={isOtherProduct ? OTHER_PRODUCT_KEY : (form.product ?? undefined)}
                onValueChange={(v) => {
                  if (v === OTHER_PRODUCT_KEY) {
                    setCustomProduct(customProduct || ' ')
                    setForm((f) => ({ ...f, product: null }))
                  } else {
                    setCustomProduct('')
                    setForm((f) => ({ ...f, product: v }))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_PRODUCT_KEY}>Outro produto</SelectItem>
                </SelectContent>
              </Select>
              {isOtherProduct && (
                <Input
                  className="mt-1"
                  placeholder="Nome do produto"
                  value={customProduct.trim()}
                  onChange={(e) => setCustomProduct(e.target.value)}
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Forma de pagamento</Label>
              <Select
                value={form.paymentMethod}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, paymentMethod: v as 'PIX' | 'Pix Parcelado' | 'Cartão' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX à vista (9%)</SelectItem>
                  <SelectItem value="Pix Parcelado">Pix Parcelado (6%)</SelectItem>
                  <SelectItem value="Cartão">Cartão (6%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="value">Valor total do contrato</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min={0}
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch
                checked={form.isOpportunity}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isOpportunity: v }))}
              />
              É oportunidade
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch
                checked={form.contractSigned}
                onCheckedChange={(v) => setForm((f) => ({ ...f, contractSigned: v }))}
              />
              Contrato assinado
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch
                checked={form.paymentReceived}
                onCheckedChange={(v) => setForm((f) => ({ ...f, paymentReceived: v }))}
              />
              Pagamento recebido (à vista)
            </label>
          </div>

          <InstallmentsEditor installments={form.installments} onChange={updateInstallments} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
