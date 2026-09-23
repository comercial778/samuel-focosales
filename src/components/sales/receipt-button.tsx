import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Link2, Paperclip, Trash2, Upload } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { deleteReceipt, recordReceipt, signedUrl } from '#/server/receipts'
import { getSupabaseBrowserClient } from '#/lib/supabase/client'
import type { Receipt } from '#/lib/types'

interface ReceiptButtonProps {
  saleId: string
  installmentId: string | null
  receipts: Receipt[]
  label: string
  onChange: () => void
}

export function ReceiptButton({ saleId, installmentId, receipts, label, onChange }: ReceiptButtonProps) {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)

  const hasReceipt = receipts.length > 0

  async function addLink() {
    if (!link.trim()) return
    setBusy(true)
    try {
      await recordReceipt({
        data: {
          saleId,
          installmentId,
          path: link.trim(),
          filename: link.trim(),
          mime: installmentId ? 'link/receipt' : 'link/contract',
          size: null,
        },
      })
      setLink('')
      onChange()
      toast.success('Comprovante adicionado')
    } catch (err) {
      toast.error('Erro ao adicionar', { description: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function uploadFile(file: File) {
    setBusy(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const path = `${saleId}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('receipts').upload(path, file)
      if (error) throw error

      await recordReceipt({
        data: {
          saleId,
          installmentId,
          path,
          filename: file.name,
          mime: file.type || null,
          size: file.size,
        },
      })
      onChange()
      toast.success('Arquivo enviado')
    } catch (err) {
      toast.error('Erro ao enviar arquivo', { description: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  async function handleOpen(receipt: Receipt) {
    try {
      const { url } = await signedUrl({ data: { id: receipt.id } })
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error('Não foi possível abrir', { description: (err as Error).message })
    }
  }

  async function handleDelete(receipt: Receipt) {
    setBusy(true)
    try {
      await deleteReceipt({ data: { id: receipt.id } })
      onChange()
    } catch (err) {
      toast.error('Erro ao excluir', { description: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title={label}
          className={hasReceipt ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}
        >
          <Paperclip className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <p className="mb-2 text-sm font-medium">{label}</p>

        {receipts.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1">
            {receipts.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleOpen(r)}
                  className="flex flex-1 items-center gap-1.5 truncate text-left hover:underline"
                >
                  <ExternalLink className="size-3.5 shrink-0" />
                  <span className="truncate">{r.filename}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  disabled={busy}
                  className="shrink-0 text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5">
            <Input
              placeholder="Colar link (Drive, etc.)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="h-8 text-xs"
            />
            <Button type="button" size="icon" className="h-8 w-8 shrink-0" disabled={busy} onClick={addLink}>
              <Link2 className="size-3.5" />
            </Button>
          </div>

          <label className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-accent">
            <Upload className="size-3.5" />
            Enviar arquivo
            <input
              type="file"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadFile(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  )
}
