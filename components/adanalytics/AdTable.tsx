// components/adanalytics/AdTable.tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { formatINR } from '@/lib/pl-engine/compute'
import { StatusBadge, BadgeColor } from '@/components/ui/StatusBadge'
import type { PlacementType } from '@/lib/adanalytics'

// ── Column definitions ────────────────────────────────────────────────────────

interface ColDef {
  key: string
  label: string
  align: 'left' | 'right'
  render: (v: unknown, row: Record<string, unknown>) => React.ReactNode
  exportVal: (v: unknown) => string
  defaultVisible: boolean
}

function fmtN(v: unknown): string {
  const n = v as number | null
  return n == null ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function fmtPct(v: unknown): string {
  const n = v as number | null
  return n == null ? '—' : `${(n * 100).toFixed(2)}%`
}

function fmtAcos(v: unknown): { text: string; cls: string } {
  const n = v as number | null
  if (n == null) return { text: '—', cls: 'text-text-secondary' }
  const pct = n * 100
  const cls = n > 0.4 ? 'text-data-negative font-medium'
            : n > 0.25 ? 'text-data-amber font-medium'
            : 'text-data-positive font-medium'
  return { text: `${pct.toFixed(1)}%`, cls }
}

function matchColor(type: string | null): BadgeColor {
  const map: Record<string, BadgeColor> = { Exact: 'green', Phrase: 'blue', Broad: 'amber', Auto: 'slate' }
  return map[type ?? ''] ?? 'slate'
}

function placementColor(p: PlacementType): BadgeColor {
  const map: Record<PlacementType, BadgeColor> = { Keyword: 'teal', Product: 'blue', Category: 'amber', Auto: 'slate' }
  return map[p]
}

const CAMPAIGN_COLS: ColDef[] = [
  { key: 'campaign_name', label: 'Campaign', align: 'left', defaultVisible: true,
    render: v => <span className="font-medium text-text-primary max-w-[220px] truncate block">{String(v ?? '—')}</span>,
    exportVal: v => String(v ?? '') },
  { key: 'impressions', label: 'Impressions', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{fmtN(v)}</span>,
    exportVal: v => fmtN(v) },
  { key: 'clicks', label: 'Clicks', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{fmtN(v)}</span>,
    exportVal: v => fmtN(v) },
  { key: 'ctr', label: 'CTR', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{fmtPct(v)}</span>,
    exportVal: v => fmtPct(v) },
  { key: 'cpc', label: 'CPC', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{formatINR(v as number)}</span>,
    exportVal: v => String(v ?? '') },
  { key: 'spend', label: 'Spend', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{formatINR(v as number)}</span>,
    exportVal: v => String(v ?? '') },
  { key: 'sales', label: 'Sales', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{formatINR(v as number)}</span>,
    exportVal: v => String(v ?? '') },
  { key: 'acos', label: 'ACOS', align: 'right', defaultVisible: true,
    render: v => { const { text, cls } = fmtAcos(v); return <span className={`tabular-nums ${cls}`}>{text}</span> },
    exportVal: v => { const n = v as number | null; return n == null ? '' : `${(n * 100).toFixed(1)}%` } },
  { key: 'roas', label: 'RoAS', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{v == null ? '—' : `${(v as number).toFixed(1)}x`}</span>,
    exportVal: v => v == null ? '' : `${(v as number).toFixed(1)}x` },
  { key: 'orders', label: 'Orders', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{fmtN(v)}</span>,
    exportVal: v => fmtN(v) },
  { key: 'units', label: 'Units', align: 'right', defaultVisible: false,
    render: v => <span className="tabular-nums text-text-secondary">{fmtN(v)}</span>,
    exportVal: v => fmtN(v) },
  { key: 'cvr', label: 'CVR', align: 'right', defaultVisible: true,
    render: v => <span className="tabular-nums text-text-secondary">{fmtPct(v)}</span>,
    exportVal: v => fmtPct(v) },
]

const TARGETING_EXTRA_COLS: ColDef[] = [
  { key: 'targeting', label: 'Target', align: 'left', defaultVisible: true,
    render: v => <span className="text-text-primary max-w-[200px] truncate block">{String(v ?? '—')}</span>,
    exportVal: v => String(v ?? '') },
  { key: 'match_type', label: 'Match', align: 'left', defaultVisible: true,
    render: v => <StatusBadge label={String(v ?? '—')} color={matchColor(v as string)} />,
    exportVal: v => String(v ?? '') },
  { key: 'placement', label: 'Placement', align: 'left', defaultVisible: true,
    render: v => <StatusBadge label={String(v ?? '—')} color={placementColor(v as PlacementType)} />,
    exportVal: v => String(v ?? '') },
  { key: 'ad_group', label: 'Ad Group', align: 'left', defaultVisible: false,
    render: v => <span className="text-text-muted text-xs">{String(v ?? '—')}</span>,
    exportVal: v => String(v ?? '') },
]

// ── Sort ──────────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc'

function sortRows(
  rows: Record<string, unknown>[],
  key: string,
  dir: SortDir
): Record<string, unknown>[] {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? -Infinity
    const bv = b[key] ?? -Infinity
    if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(String(bv)) : String(bv).localeCompare(av)
    return dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })
}

// ── CSV / XLSX export ─────────────────────────────────────────────────────────

function toCSV(rows: Record<string, unknown>[], cols: ColDef[]): string {
  const escape = (s: string) =>
    s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  const header = cols.map(c => escape(c.label)).join(',')
  const body   = rows.map(r => cols.map(c => escape(c.exportVal(r[c.key]))).join(',')).join('\n')
  return `${header}\n${body}`
}

function downloadCSV(content: string, name: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

function downloadXLSX(rows: Record<string, unknown>[], cols: ColDef[], name: string) {
  const aoa = [
    cols.map(c => c.label),
    ...rows.map(r => cols.map(c => c.exportVal(r[c.key]))),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ad Analytics')
  XLSX.writeFile(wb, name)
}

// ── Column visibility ─────────────────────────────────────────────────────────

const LS_KEY = 'mm_adtable_cols'

function loadVisibility(cols: ColDef[]): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch { /* ignore */ }
  return new Set(cols.filter(c => c.defaultVisible).map(c => c.key))
}

function saveVisibility(visible: Set<string>) {
  localStorage.setItem(LS_KEY, JSON.stringify([...visible]))
}

// ── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function AdTable({
  rows,
  tab,
}: {
  rows: Record<string, unknown>[]
  tab: 'campaigns' | 'targeting'
}) {
  // For targeting view, combine CAMPAIGN_COLS + TARGETING_EXTRA_COLS
  const baseCols: ColDef[] = tab === 'campaigns'
    ? CAMPAIGN_COLS
    : [
        CAMPAIGN_COLS[0], // campaign_name
        TARGETING_EXTRA_COLS[0], // targeting
        TARGETING_EXTRA_COLS[1], // match_type
        TARGETING_EXTRA_COLS[2], // placement
        TARGETING_EXTRA_COLS[3], // ad_group
        ...CAMPAIGN_COLS.slice(1), // rest of metrics
      ]

  const [visible, setVisible] = useState<Set<string>>(() => loadVisibility(baseCols))
  const [showColMenu, setShowColMenu]   = useState(false)
  const [sortKey, setSortKey]           = useState<string>('spend')
  const [sortDir, setSortDir]           = useState<SortDir>('desc')
  const [search, setSearch]             = useState('')
  const [page, setPage]                 = useState(1)

  useEffect(() => { setPage(1) }, [rows, tab, search])

  const activeCols = baseCols.filter(c => visible.has(c.key))

  const searchKey = tab === 'campaigns' ? 'campaign_name' : 'targeting'
  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter(r => String(r[searchKey] ?? '').toLowerCase().includes(q))
  }, [rows, search, searchKey])

  const sorted = useMemo(() => sortRows(filtered, sortKey, sortDir), [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key); setSortDir('desc')
    }
  }

  function toggleCol(key: string) {
    const next = new Set(visible)
    next.has(key) ? next.delete(key) : next.add(key)
    setVisible(next)
    saveVisibility(next)
  }

  const exportName = `ad-analytics-${tab}-${new Date().toISOString().split('T')[0]}`

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder={tab === 'campaigns' ? 'Search campaigns…' : 'Search targets…'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-1.5 text-sm bg-surface-card border border-border-default rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <span className="text-xs text-text-muted">{filtered.length} rows</span>

        {/* Column toggle */}
        <div className="relative">
          <button
            onClick={() => setShowColMenu(v => !v)}
            className="px-3 py-1.5 text-sm border border-border-default rounded-lg text-text-secondary hover:bg-surface-raised transition-colors"
          >
            Columns
          </button>
          {showColMenu && (
            <div className="absolute right-0 top-9 z-20 bg-surface-card border border-border-default rounded-xl shadow-lg p-3 min-w-[160px] space-y-1">
              {baseCols.map(c => (
                <label key={c.key} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary">
                  <input type="checkbox" checked={visible.has(c.key)} onChange={() => toggleCol(c.key)} className="accent-accent-primary" />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Export */}
        <button
          onClick={() => downloadCSV(toCSV(sorted, baseCols), `${exportName}.csv`)}
          className="px-3 py-1.5 text-sm border border-border-default rounded-lg text-text-secondary hover:bg-surface-raised transition-colors"
        >
          CSV
        </button>
        <button
          onClick={() => downloadXLSX(sorted, baseCols, `${exportName}.xlsx`)}
          className="px-3 py-1.5 text-sm border border-border-default rounded-lg text-text-secondary hover:bg-surface-raised transition-colors"
        >
          Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border-default">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-surface-raised border-b border-border-default">
              {activeCols.map(c => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className={`px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide cursor-pointer select-none hover:text-text-secondary transition-colors ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {c.label}
                  {sortKey === c.key && (
                    <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {paged.map((row, i) => (
              <tr key={i} className="hover:bg-surface-raised transition-colors">
                {activeCols.map(c => (
                  <td
                    key={c.key}
                    className={`px-4 py-2.5 ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.render(row[c.key], row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 border border-border-default rounded-lg hover:bg-surface-raised disabled:opacity-40 transition-colors"
          >
            ← Prev
          </button>
          <span>Page {page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 border border-border-default rounded-lg hover:bg-surface-raised disabled:opacity-40 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
