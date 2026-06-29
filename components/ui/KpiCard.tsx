import { cn } from '@/lib/utils'

export interface KpiCardProps {
  label: string
  value: string
  sub?: string
  trend?: number
  variant?: 'default' | 'positive' | 'negative' | 'warning'
  className?: string
}

const variantValueClass: Record<NonNullable<KpiCardProps['variant']>, string> = {
  default: 'text-text-primary',
  positive: 'text-data-positive',
  negative: 'text-data-negative',
  warning: 'text-data-amber',
}

export function KpiCard({ label, value, sub, trend, variant = 'default', className }: KpiCardProps) {
  const trendUp = trend !== undefined && trend > 0
  const trendDown = trend !== undefined && trend < 0

  return (
    <div className={cn(
      'bg-surface-card border border-border-default rounded-xl p-4',
      className
    )}>
      <p className="text-xs font-medium text-text-muted mb-1">{label}</p>
      <p className={cn(
        'text-lg font-bold tabular-nums',
        variantValueClass[variant]
      )}>
        {value}
      </p>
      <div className="flex items-center gap-2 mt-0.5 min-h-[16px]">
        {sub && <p className="text-xs text-text-muted">{sub}</p>}
        {trend !== undefined && (
          <span className={cn(
            'text-xs font-medium',
            trendUp && 'text-data-positive',
            trendDown && 'text-data-negative',
            !trendUp && !trendDown && 'text-text-muted'
          )}>
            {trendUp ? '↑' : trendDown ? '↓' : '–'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}
