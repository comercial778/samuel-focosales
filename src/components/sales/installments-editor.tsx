import { Plus, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { formatCurrency } from '#/lib/format'
import type { SaleInstallmentInput } from '#/lib/types'

interface InstallmentsEditorProps {
  installments: SaleInstallmentInput[]
  onChange: (installments: SaleInstallmentInput[]) => void
}

export function InstallmentsEditor({ installments, onChange }: InstallmentsEditorProps) {
  function update(index: number, patch: Partial<SaleInstallmentInput>) {
    const next = installments.slice()
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  function remove(index: number) {
    onChange(installments.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...installments, { value: 0, dueDate: null, received: false }])
  }

  const total = installments.reduce((sum, i) => sum + (Number(i.value) || 0), 0)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>Parcelas</Label>
        <span className="text-xs text-muted-foreground">Total: {formatCurrency(total)}</span>
      </div>

      <div className="flex flex-col gap-2">
        {installments.map((installment, index) => (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 rounded-md border p-2"
          >
            <span className="w-6 shrink-0 text-xs text-muted-foreground">#{index + 1}</span>
            <Input
              type="number"
              step="0.01"
              min={0}
              className="w-28"
              value={installment.value}
              onChange={(e) => update(index, { value: Number(e.target.value) })}
              placeholder="Valor"
            />
            <Input
              type="date"
              className="w-40"
              value={installment.dueDate ?? ''}
              onChange={(e) => update(index, { dueDate: e.target.value || null })}
            />
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={installment.received}
                onCheckedChange={(v) => update(index, { received: v })}
              />
              Pago
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto text-destructive"
              onClick={() => remove(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="self-start" onClick={add}>
        <Plus className="size-4" />
        Adicionar parcela
      </Button>
    </div>
  )
}
