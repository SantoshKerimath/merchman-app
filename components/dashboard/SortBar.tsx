'use client'
import { useRouter } from 'next/navigation'

const SORTS = [
  { key: 'sales', label: 'Sales' },
  { key: 'netrevenue', label: 'Net Revenue' },
  { key: 'acos', label: 'ACOS' },
] as const

type SortKey = typeof SORTS[number]['key']

interface Props {
  currentSort: string
}

export default function SortBar({ currentSort }: Props) {
  const router = useRouter()

  function setSort(key: SortKey) {
    router.replace(`?sort=${key}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted font-medium mr-1">Sort:</span>
      {SORTS.map(s => (
        <button
          key={s.key}
          onClick={() => setSort(s.key)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            currentSort === s.key
              ? 'bg-accent-primary text-text-on-brand border-accent-primary'
              : 'bg-surface-card text-text-secondary border-border-default hover:border-accent-primary'
          }`}
        >
          {s.label}
          {currentSort === s.key ? ' ↓' : ''}
        </button>
      ))}
    </div>
  )
}
