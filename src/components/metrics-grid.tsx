import { Card, CardContent } from '#/components/ui/card'
import { cn } from '#/lib/utils'

export interface Metric {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'positive' | 'negative'
}

export function MetricsGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((m) => (
        <Card key={m.label} className="relative overflow-hidden">
          <span
            className={cn(
              'absolute inset-x-0 top-0 h-0.5',
              m.tone === 'positive' && 'bg-emerald-500 dark:bg-primary',
              m.tone === 'negative' && 'bg-amber-500',
              (!m.tone || m.tone === 'default') && 'bg-border dark:bg-white/10',
            )}
          />
          <CardContent className="p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{m.label}</p>
            <p
              className={cn(
                'mt-1.5 text-xl font-bold tabular-nums tracking-tight',
                m.tone === 'positive' && 'text-emerald-600 dark:text-primary',
                m.tone === 'negative' && 'text-amber-600 dark:text-amber-400',
              )}
            >
              {m.value}
            </p>
            {m.hint && <p className="mt-0.5 text-xs text-muted-foreground">{m.hint}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
