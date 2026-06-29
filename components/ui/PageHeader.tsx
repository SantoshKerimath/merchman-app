import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  breadcrumb?: { label: string; href: string }[]
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <p className="text-sm text-text-muted mb-0.5">
            {breadcrumb.map((item, i) => (
              <span key={item.href}>
                {i > 0 && <span className="mx-1 text-text-muted">›</span>}
                <Link href={item.href} className="hover:text-text-secondary transition-colors">
                  {item.label}
                </Link>
              </span>
            ))}
            <span className="mx-1 text-text-muted">›</span>
            <span className="text-text-secondary">{title}</span>
          </p>
        )}
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
