import { cn } from '@/lib/utils'

const paddingClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const

export interface SectionCardProps {
  title?: string
  action?: React.ReactNode
  padding?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

export function SectionCard({ title, action, padding = 'md', children, className }: SectionCardProps) {
  return (
    <div className={cn(
      'bg-surface-card border border-border-default rounded-xl',
      className
    )}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          {title && <p className="text-sm font-semibold text-text-primary">{title}</p>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  )
}
