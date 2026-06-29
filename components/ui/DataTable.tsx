import { cn } from '@/lib/utils'

export interface DataTableHeader {
  label: string
  align?: 'left' | 'right' | 'center'
}

export interface DataTableProps {
  headers: DataTableHeader[]
  children: React.ReactNode
  className?: string
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

export function DataTable({ headers, children, className }: DataTableProps) {
  return (
    <div className={cn(
      'bg-surface-card border border-border-default rounded-xl overflow-hidden',
      className
    )}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default bg-surface-raised">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-4 py-2.5 text-xs text-text-muted font-medium',
                    alignClass[h.align ?? 'left']
                  )}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  )
}
