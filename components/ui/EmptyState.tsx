import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
}

export interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && <div className="text-3xl mb-3">{icon}</div>}
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description && (
        <p className="text-xs text-text-muted mt-1 max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-block bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
