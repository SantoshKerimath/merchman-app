'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatINR } from '@/lib/pl-engine/compute'

export interface SkuRow {
  sku: string
  sales: number
  units: number
  orders: number
  grossProfit: number
  cogs: number | null
  netProfit: number | null
}

type SortKey = 'sales' | 'units' | 'orders' | 'grossProfit' | 'cogs' | 'netProfit'
type SortDir = 'asc' | 'desc'

interface Props {
  data: SkuRow[]
  brandId: string
}

const BASE_COLS: { key: SortKey; label: string }[] = [
  { key: 'sales', label: 'Sales' },
  { key: 'units', label: 'Units' },
  { key: 'orders', label: 'Orders' },
  { key: 'grossProfit', label: 'Net Revenue' },
]
const COGS_COLS: { key: SortKey; label: string }[] = [
  { key: 'cogs', label: 'COGS/unit' },
  { key: 'netProfit', label: 'Contribution Margin' },
]

export default function ProductTable({ data, brandId }: Props) {
  const router = useRouter()

  // Local COGS so edits show immediately before router.refresh()
  const [localCogs, setLocalCogs] = useState<Record<string, number | null>>(
    Object.fromEntries(data.map(r => [r.sku, r.cogs]))
  )
  const [editingSku, setEditingSku] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingSku, setSavingSku] = useState<string | null>(null)
  const [cogsErrors, setCogsErrors] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null)
  const [showCogs, setShowCogs] = useState(false)

  // Merge local COGS + recompute Net Profit client-side
  const rows = data.map(r => {
    const cogs = localCogs[r.sku] ?? null
    const netProfit = cogs !== null ? r.grossProfit - cogs * r.units : null
    return { ...r, cogs, netProfit }
  })

  function toggleSort(key: SortKey) {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: 'desc' }
      if (prev.dir === 'desc') return { key, dir: 'asc' }
      return null
    })
  }

  const sorted = sort
    ? [...rows].sort((a, b) => {
        const va = (a[sort.key] ?? -Infinity) as number
        const vb = (b[sort.key] ?? -Infinity) as number
        return sort.dir === 'desc' ? vb - va : va - vb
      })
    : rows

  async function saveCogs(sku: string, rawValue: string) {
    const cogs = parseFloat(rawValue)
    if (isNaN(cogs) || cogs < 0 || cogs > 99999) {
      setCogsErrors(e => ({ ...e, [sku]: 'Valid amount 0–99,999' }))
      setEditingSku(null)
      return
    }
    // Optimistic update
    setLocalCogs(prev => ({ ...prev, [sku]: cogs }))
    setEditingSku(null)
    setSavingSku(sku)
    setCogsErrors(e => { const n = { ...e }; delete n[sku]; return n })

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand_id: brandId, sku, cogs }),
    })

    if (!res.ok) {
      // Revert on failure
      setLocalCogs(prev => ({
        ...prev,
        [sku]: data.find(r => r.sku === sku)?.cogs ?? null,
      }))
      setCogsErrors(e => ({ ...e, [sku]: 'Save failed — try again' }))
    } else {
      router.refresh() // KPI strip re-renders with updated totals
    }
    setSavingSku(null)
  }

  const totalSales = rows.reduce((s, r) => s + r.sales, 0)
  const totalUnits = rows.reduce((s, r) => s + r.units, 0)
  const totalOrders = rows.reduce((s, r) => s + r.orders, 0)
  const totalGP = rows.reduce((s, r) => s + r.grossProfit, 0)
  const allHaveNP = rows.length > 0 && rows.every(r => r.netProfit !== null)
  const totalNP = allHaveNP ? rows.reduce((s, r) => s + (r.netProfit ?? 0), 0) : null

  if (data.length === 0) {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl p-6 text-center mb-4">
        <p className="text-sm text-text-muted">No transactions in this period</p>
      </div>
    )
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (!sort || sort.key !== col) return <span className="text-text-muted ml-1">↕</span>
    return <span className="text-accent-primary ml-1">{sort.dir === 'desc' ? '↓' : '↑'}</span>
  }

  return (
    <div className="bg-surface-card border border-border-default rounded-xl overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">Product Breakdown</p>
        <button
          onClick={() => setShowCogs(v => !v)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            showCogs
              ? 'border-accent-primary text-accent-primary bg-accent-primary-subtle'
              : 'border-border-default text-text-muted bg-surface-card'
          }`}
        >
          {showCogs ? 'Hide cost analysis' : 'Show cost analysis'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-raised text-xs text-text-muted">
              <th className="text-left px-4 py-2.5 font-medium">SKU</th>
              {BASE_COLS.map(c => (
                <th
                  key={c.key}
                  className="text-right px-4 py-2.5 font-medium cursor-pointer hover:text-text-primary select-none"
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                  <SortIcon col={c.key} />
                </th>
              ))}
              {showCogs && COGS_COLS.map(c => (
                <th
                  key={c.key}
                  className="text-right px-4 py-2.5 font-medium cursor-pointer hover:text-text-primary select-none text-accent-primary"
                  onClick={() => toggleSort(c.key)}
                >
                  {c.label}
                  <SortIcon col={c.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.sku} className="border-t border-border-subtle hover:bg-surface-raised/50">
                <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">{r.sku}</td>
                <td className="px-4 py-2.5 text-right">{formatINR(r.sales)}</td>
                <td className="px-4 py-2.5 text-right">{r.units.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right">{r.orders.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right">{formatINR(r.grossProfit)}</td>
                {showCogs && (
                  <>
                    {/* COGS/unit — inline editable */}
                    <td className="px-4 py-2.5 text-right">
                      {editingSku === r.sku ? (
                        <input
                          type="number"
                          min={0}
                          max={99999}
                          value={editValue}
                          autoFocus
                          className="w-24 text-right border border-border-default rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent-primary bg-surface-card text-text-primary"
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => saveCogs(r.sku, editValue)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveCogs(r.sku, editValue)
                            if (e.key === 'Escape') setEditingSku(null)
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingSku(r.sku)
                            setEditValue(r.cogs?.toString() ?? '')
                          }}
                          className={`group flex items-center justify-end gap-1 w-full ${
                            savingSku === r.sku ? 'opacity-50' : ''
                          }`}
                        >
                          <span className={r.cogs ? 'text-text-primary' : 'text-text-muted'}>
                            {r.cogs ? formatINR(r.cogs) : '—'}
                          </span>
                          <span className="text-text-muted opacity-0 group-hover:opacity-100 text-xs">✏</span>
                        </button>
                      )}
                      {cogsErrors[r.sku] && (
                        <p className="text-xs text-data-negative mt-0.5">{cogsErrors[r.sku]}</p>
                      )}
                    </td>
                    {/* Contribution Margin */}
                    <td className={`px-4 py-2.5 text-right font-medium ${
                      r.netProfit === null
                        ? 'text-text-muted'
                        : r.netProfit >= 0
                        ? 'text-data-positive'
                        : 'text-data-negative'
                    }`}>
                      {r.netProfit !== null ? formatINR(r.netProfit) : '—'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border-default bg-surface-raised font-semibold text-xs">
              <td className="px-4 py-2.5 text-text-secondary">Total</td>
              <td className="px-4 py-2.5 text-right">{formatINR(totalSales)}</td>
              <td className="px-4 py-2.5 text-right">{totalUnits.toLocaleString()}</td>
              <td className="px-4 py-2.5 text-right">{totalOrders.toLocaleString()}</td>
              <td className="px-4 py-2.5 text-right">{formatINR(totalGP)}</td>
              {showCogs && (
                <>
                  <td className="px-4 py-2.5 text-right text-text-muted">—</td>
                  <td className={`px-4 py-2.5 text-right ${
                    totalNP === null
                      ? 'text-text-muted'
                      : totalNP >= 0
                      ? 'text-data-positive'
                      : 'text-data-negative'
                  }`}>
                    {totalNP !== null ? formatINR(totalNP) : '—'}
                  </td>
                </>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
