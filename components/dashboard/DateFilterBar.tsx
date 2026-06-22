'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface FilterEntry {
  from: string
  to: string
  label: string
  savedName?: string
}

interface Props {
  brandId: string
  currentFrom: string | null
  currentTo: string | null
}

function fmt(d: Date): string {
  return d.toISOString().split('T')[0]
}

function last7(): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 7)
  return { from: fmt(from), to: fmt(to) }
}

function last30(): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return { from: fmt(from), to: fmt(to) }
}

function mtd(): { from: string; to: string } {
  const now = new Date()
  return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) }
}

function toLabel(from: string, to: string): string {
  const f = new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const t = new Date(to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return `${f} – ${t}`
}

function writeRecent(brandId: string, entry: FilterEntry): FilterEntry[] {
  try {
    const key = `mm_recent_${brandId}`
    const existing: FilterEntry[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    const deduped = existing.filter(e => !(e.from === entry.from && e.to === entry.to))
    const updated = [entry, ...deduped].slice(0, 4)
    localStorage.setItem(key, JSON.stringify(updated))
    localStorage.setItem(`mm_last_${brandId}`, JSON.stringify(entry))
    return updated
  } catch {
    return []
  }
}

export default function DateFilterBar({ brandId, currentFrom, currentTo }: Props) {
  const router = useRouter()
  const [recent, setRecent] = useState<FilterEntry[]>([])
  const [saved, setSaved] = useState<FilterEntry[]>([])
  const [showCustom, setShowCustom] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(`mm_recent_${brandId}`) ?? '[]'))
      setSaved(JSON.parse(localStorage.getItem(`mm_saved_${brandId}`) ?? '[]'))
    } catch {}

    if (!currentFrom && !currentTo) {
      try {
        const last = localStorage.getItem(`mm_last_${brandId}`)
        if (last) {
          const entry: FilterEntry = JSON.parse(last)
          router.replace(`?from=${entry.from}&to=${entry.to}`)
          return
        }
      } catch {}
      const { from, to } = last30()
      router.replace(`?from=${from}&to=${to}`)
    }
  }, [brandId]) // eslint-disable-line react-hooks/exhaustive-deps

  function apply(from: string, to: string) {
    const entry: FilterEntry = { from, to, label: toLabel(from, to) }
    setRecent(writeRecent(brandId, entry))
    router.push(`?from=${from}&to=${to}`)
    setShowCustom(false)
  }

  function applyPreset(preset: '7d' | '30d' | 'mtd' | 'all') {
    if (preset === 'all') {
      router.push('?')
      return
    }
    const range = preset === '7d' ? last7() : preset === '30d' ? last30() : mtd()
    apply(range.from, range.to)
  }

  function saveFilter() {
    if (!currentFrom || !currentTo) return
    const name = window.prompt('Name this filter:')
    if (!name?.trim()) return
    const entry: FilterEntry = {
      from: currentFrom,
      to: currentTo,
      label: name.trim(),
      savedName: name.trim(),
    }
    try {
      const key = `mm_saved_${brandId}`
      const existing: FilterEntry[] = JSON.parse(localStorage.getItem(key) ?? '[]')
      const updated = [...existing, entry]
      localStorage.setItem(key, JSON.stringify(updated))
      setSaved(updated)
    } catch {}
  }

  function deleteSaved(entry: FilterEntry) {
    try {
      const key = `mm_saved_${brandId}`
      const existing: FilterEntry[] = JSON.parse(localStorage.getItem(key) ?? '[]')
      const updated = existing.filter(
        e => !(e.from === entry.from && e.to === entry.to && e.savedName === entry.savedName)
      )
      localStorage.setItem(key, JSON.stringify(updated))
      setSaved(updated)
    } catch {}
  }

  const isActive = (from: string, to: string) =>
    currentFrom === from && currentTo === to

  const presets = [
    { id: '7d' as const, label: 'Last 7D' },
    { id: '30d' as const, label: 'Last 30D' },
    { id: 'mtd' as const, label: 'MTD' },
    { id: 'all' as const, label: 'All time' },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
      {/* Presets */}
      <div className="flex items-center gap-1.5">
        {presets.map(p => (
          <button
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              p.id === 'all' && !currentFrom && !currentTo
                ? 'bg-[#1E2761] border-[#1E2761] text-white'
                : 'border-slate-200 text-slate-600 hover:border-slate-400'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(v => !v)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-slate-400 transition-colors"
        >
          Custom ▾
        </button>
      </div>

      {/* Custom range */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={e => setCustomFrom(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
          />
          <span className="text-xs text-slate-400">–</span>
          <input
            type="date"
            value={customTo}
            onChange={e => setCustomTo(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
          />
          <button
            onClick={() => { if (customFrom && customTo) apply(customFrom, customTo) }}
            disabled={!customFrom || !customTo}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#0D9488] text-white disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      )}

      {/* Divider */}
      {(recent.length > 0 || saved.length > 0) && (
        <div className="w-px h-5 bg-slate-200 mx-1" />
      )}

      {/* Recent chips */}
      {recent.map((entry, i) => (
        <button
          key={i}
          onClick={() => apply(entry.from, entry.to)}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            isActive(entry.from, entry.to)
              ? 'bg-[#1E2761] border-[#1E2761] text-white'
              : 'border-slate-200 text-slate-500 hover:border-slate-400'
          }`}
        >
          {entry.label}
        </button>
      ))}

      {/* Saved chips */}
      {saved.map((entry, i) => (
        <span
          key={i}
          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border ${
            isActive(entry.from, entry.to)
              ? 'bg-[#0D9488] border-[#0D9488] text-white'
              : 'border-teal-200 text-teal-700 bg-teal-50'
          }`}
        >
          <button onClick={() => apply(entry.from, entry.to)}>{entry.savedName}</button>
          <button
            onClick={() => deleteSaved(entry)}
            className="opacity-60 hover:opacity-100 ml-0.5"
          >
            ✕
          </button>
        </span>
      ))}

      {/* Save current */}
      {currentFrom && currentTo && (
        <button
          onClick={saveFilter}
          title="Save this filter"
          className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          🔖
        </button>
      )}
    </div>
  )
}
