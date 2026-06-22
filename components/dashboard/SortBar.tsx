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
      <span className="text-xs text-slate-400 font-medium mr-1">Sort:</span>
      {SORTS.map(s => (
        <button
          key={s.key}
          onClick={() => setSort(s.key)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            currentSort === s.key
              ? 'bg-[#0D9488] text-white border-[#0D9488]'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
          }`}
        >
          {s.label}
          {currentSort === s.key ? ' ↓' : ''}
        </button>
      ))}
    </div>
  )
}
