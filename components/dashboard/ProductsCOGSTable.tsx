'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatINR } from '@/lib/pl-engine/compute'

interface SkuRow {
  sku: string
  units_sold: number
  product_sales: number
  cogs: number | null
  product_id: string | null
}

interface Props {
  brandId: string
  initialProducts: SkuRow[]
}

export default function ProductsCOGSTable({ brandId, initialProducts }: Props) {
  const router = useRouter()
  const [products, setProducts] = useState<SkuRow[]>(initialProducts)
  const [editingSku, setEditingSku] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingSku, setSavingSku] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [open, setOpen] = useState(false)

  async function saveCogs(sku: string, rawValue: string) {
    const cogs = parseFloat(rawValue)
    if (isNaN(cogs) || cogs < 0 || cogs > 99999) {
      setErrors(e => ({ ...e, [sku]: 'Enter valid amount (0–99,999)' }))
      setEditingSku(null)
      return
    }

    // Optimistic update
    setProducts(prev =>
      prev.map(p => p.sku === sku ? { ...p, cogs } : p)
    )
    setEditingSku(null)
    setSavingSku(sku)
    setErrors(e => { const n = { ...e }; delete n[sku]; return n })

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand_id: brandId, sku, cogs }),
    })

    if (!res.ok) {
      // Revert optimistic update
      setProducts(initialProducts)
      setErrors(e => ({ ...e, [sku]: 'Save failed — try again' }))
    } else {
      router.refresh() // re-render server component → KPI strip updates
    }
    setSavingSku(null)
  }

  function startEdit(sku: string, currentCogs: number | null) {
    setEditingSku(sku)
    setEditValue(currentCogs?.toString() ?? '')
  }

  if (products.length === 0) {
    return (
      <div className="bg-surface-card border border-border-default rounded-xl mt-4 px-5 py-8 text-center text-sm text-text-muted">
        No SKUs found. Upload settlement data first.
      </div>
    )
  }

  return (
    <div className="bg-surface-card border border-border-default rounded-xl mt-4">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-sm font-semibold text-text-primary">
          Products &amp; COGS
          <span className="ml-2 text-xs font-normal text-text-muted">
            {products.length} SKUs
          </span>
        </span>
        <span className="text-text-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-border-subtle">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted border-b border-border-subtle">
                <th className="px-5 py-2 text-left font-medium">SKU</th>
                <th className="px-5 py-2 text-right font-medium">Units Sold</th>
                <th className="px-5 py-2 text-right font-medium">Revenue</th>
                <th className="px-5 py-2 text-right font-medium">COGS/unit</th>
                <th className="px-5 py-2 text-right font-medium">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const netProfit = p.cogs !== null && p.cogs > 0
                  ? p.product_sales - (p.cogs * p.units_sold)
                  : null

                return (
                  <tr
                    key={p.sku}
                    className="border-b border-border-subtle last:border-0"
                  >
                    <td className="px-5 py-2.5 font-mono text-xs text-text-secondary">{p.sku}</td>
                    <td className="px-5 py-2.5 text-right text-text-secondary">{p.units_sold.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-right text-text-secondary">{formatINR(p.product_sales)}</td>
                    <td className="px-5 py-2.5 text-right">
                      {editingSku === p.sku ? (
                        <input
                          type="number"
                          min={0}
                          max={99999}
                          value={editValue}
                          autoFocus
                          className="w-24 text-right border border-border-default rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary bg-surface-card text-text-primary"
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => saveCogs(p.sku, editValue)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveCogs(p.sku, editValue)
                            if (e.key === 'Escape') setEditingSku(null)
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(p.sku, p.cogs)}
                          className={`group flex items-center justify-end gap-1 w-full ${
                            savingSku === p.sku ? 'opacity-50' : ''
                          }`}
                        >
                          <span className="text-text-secondary">
                            {p.cogs ? formatINR(p.cogs) : '—'}
                          </span>
                          <span className="text-text-muted opacity-0 group-hover:opacity-100 text-xs">✏</span>
                        </button>
                      )}
                      {errors[p.sku] && (
                        <p className="text-xs text-data-negative mt-0.5">{errors[p.sku]}</p>
                      )}
                    </td>
                    <td className={`px-5 py-2.5 text-right font-medium ${
                      netProfit === null ? 'text-text-muted' :
                      netProfit >= 0 ? 'text-data-positive' : 'text-data-negative'
                    }`}>
                      {netProfit === null ? '—' : formatINR(netProfit)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
