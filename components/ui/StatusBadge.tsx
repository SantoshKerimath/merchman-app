import { cn } from '@/lib/utils'

export type BadgeColor = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'teal'

export interface StatusBadgeProps {
  label: string
  color: BadgeColor
  size?: 'sm' | 'md'
  className?: string
}

const colorClasses: Record<BadgeColor, string> = {
  green: 'bg-data-positive/10 text-data-positive',
  red: 'bg-data-negative/10 text-data-negative',
  amber: 'bg-data-amber/10 text-data-amber',
  blue: 'bg-data-blue/10 text-data-blue',
  slate: 'bg-surface-raised text-text-muted',
  teal: 'bg-accent-primary-subtle text-accent-primary',
}

const sizeClasses: Record<NonNullable<StatusBadgeProps['size']>, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
}

export function StatusBadge({ label, color, size = 'sm', className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      colorClasses[color],
      sizeClasses[size],
      className
    )}>
      {label}
    </span>
  )
}
