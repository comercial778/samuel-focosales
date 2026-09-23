import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { requireAuthContext } from '#/lib/auth-guard'
import { getSettings, setSalary, setShareEnabled } from '#/server/settings'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'

export const Route = createFileRoute('/configuracoes')({
  beforeLoad: requireAuthContext,
  loader: async () => ({ settings: await getSettings() }),
  component: ConfiguracoesPage,
})

function ConfiguracoesPage() {
  const { settings } = Route.useLoaderData()
  const router = useRouter()
  const [baseSalary, setBaseSalary] = useState(settings.baseSalary)
  const [shareEnabled, setShareEnabledState] = useState(settings.shareEnabled)
  const [saving, setSaving] = useState(false)

  async function saveSalary() {
    setSaving(true)
    try {
      await setSalary({ data: { baseSalary } })
      toast.success('Salário base atualizado')
      router.invalidate()
    } catch (err) {
      toast.error('Erro ao salvar', { description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  async function toggleShare(value: boolean) {
    setShareEnabledState(value)
    try {
      await setShareEnabled({ data: { shareEnabled: value } })
      router.invalidate()
    } catch (err) {
      toast.error('Erro ao salvar', { description: (err as Error).message })
      setShareEnabledState(!value)
    }
  }

  return (
    <main className="page-wrap flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Salário base e preferências do workspace</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Salário base</CardTitle>
          <CardDescription>Usado no cálculo do total a receber junto com a comissão.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="salary">Valor mensal</Label>
            <Input
              id="salary"
              type="number"
              step="0.01"
              min={0}
              value={baseSalary}
              onChange={(e) => setBaseSalary(Number(e.target.value))}
            />
          </div>
          <Button className="self-start" disabled={saving} onClick={saveSalary}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Compartilhamento</CardTitle>
          <CardDescription>Permite compartilhar o dashboard com outras contas.</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Switch checked={shareEnabled} onCheckedChange={toggleShare} />
            Compartilhamento habilitado
          </label>
        </CardContent>
      </Card>
    </main>
  )
}
