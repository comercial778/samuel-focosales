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
        <Card key={m.label}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">{m.label}</p>
            <p
              className={cn(
                'mt-1 text-lg font-semibold tabular-nums',
                m.tone === 'positive' && 'text-emerald-600 dark:text-emerald-400',
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
