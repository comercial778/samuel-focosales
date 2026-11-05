import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { ReceiptButton } from './receipt-button'
import { deleteInstallment, toggleInstallmentReceived, updateInstallment } from '#/server/sales'
import { daysUntil, formatCurrency, formatDate } from '#/lib/format'
import type { Installment, Receipt } from '#/lib/types'

interface InstallmentListProps {
  saleId: string
  installments: Installment[]
  receipts: Receipt[]
  onChange: () => void
}

export function InstallmentList({ saleId, installments, receipts, onChange }: InstallmentListProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {installments.map((installment, index) => (
        <InstallmentRow
          key={installment.id}
          index={index}
          saleId={saleId}
          installment={installment}
          receipts={receipts.filter((r) => r.installmentId === installment.id)}
          onChange={onChange}
        />
      ))}
      {installments.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma parcela cadastrada.</p>
      )}
    </div>
  )
}

function InstallmentRow({
  index,
  saleId,
  installment,
  receipts,
  onChange,
}: {
  index: number
  saleId: string
  installment: Installment
  receipts: Receipt[]
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editValue, setEditValue] = useState(installment.value)
  const [editDate, setEditDate] = useState(installment.dueDate ?? '')

  async function toggle() {
    setBusy(true)
    try {
      await toggleInstallmentReceived({ data: { id: installment.id, received: !installment.received } })
      onChange()
    } catch (err) {
      toast.error('Erro ao atualizar parcela', { description: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    setBusy(true)
    try {
      await updateInstallment({
        data: {
          id: installment.id,
          value: editValue,
          dueDate: editDate || null,
          received: installment.received,
        },
      })
      setEditOpen(false)
      onChange()
    } catch (err) {
      toast.error('Erro ao editar parcela', { description: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await deleteInstallment({ data: { id: installment.id } })
      onChange()
    } catch (err) {
      toast.error('Erro ao excluir parcela', { description: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const urgency =
    !installment.received && installment.dueDate
      ? daysUntil(installment.dueDate) < 0
        ? 'overdue'
        : daysUntil(installment.dueDate) <= 7
          ? 'soon'
          : null
      : null

  return (
    <div
      className={
        'flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm' +
        (urgency === 'overdue' ? ' border-destructive/40 bg-destructive/5' : '') +
        (urgency === 'soon' ? ' border-amber-400/50 bg-amber-500/5' : '')
      }
    >
      <span className="w-6 shrink-0 text-xs text-muted-foreground">#{index + 1}</span>
      <span className="w-24 shrink-0 font-medium tabular-nums">{formatCurrency(installment.value)}</span>
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{formatDate(installment.dueDate)}</span>

      <button type="button" onClick={toggle} disabled={busy} className="shrink-0">
        <Badge variant={installment.received ? 'success' : 'warning'} className="cursor-pointer">
          {installment.received ? 'Pago' : 'Pendente'}
        </Badge>
      </button>

      {urgency === 'overdue' && <Badge variant="destructive">Atrasada</Badge>}
      {urgency === 'soon' && <Badge variant="warning">Vence em breve</Badge>}

      <div className="ml-auto flex items-center gap-0.5">
        <ReceiptButton
          saleId={saleId}
          installmentId={installment.id}
          receipts={receipts}
          label="Comprovante da parcela"
          onChange={onChange}
        />

        <Popover open={editOpen} onOpenChange={setEditOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon">
              <Pencil className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <p className="mb-2 text-sm font-medium">Editar parcela</p>
            <div className="flex flex-col gap-2">
              <Input
                type="number"
                step="0.01"
                value={editValue}
                onChange={(e) => setEditValue(Number(e.target.value))}
              />
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              <Button type="button" size="sm" disabled={busy} onClick={saveEdit}>
                Salvar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={remove} disabled={busy}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
