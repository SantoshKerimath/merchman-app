'use client'

import { useState, useEffect, useRef } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge, BadgeColor } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'

interface TargetingRow {
  targeting: string
  match_type: string | null
  spend: number | null
  sales: number | null
  acos: number | null
  roas: number | null
  orders: number | null
  clicks: number | null
  impressions: number | null
  cvr: number | null
  units: number | null
}

interface TargetingData {
  topSpend: TargetingRow[]
  wasted: TargetingRow[]
  topConverters: TargetingRow[]
}

function fmt(n: number | null, prefix = '') {
  if (n === null || n === undefined) return '—'
  return `${prefix}${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function fmtAcos(n: number | null) {
  if (n === null || n === undefined) return '—'
  // ACOS might be stored as 0–1 or 0–100
  const v = n > 1 ? n : n * 100
  return `${v.toFixed(1)}%`
}

function matchColor(type: string | null): BadgeColor {
  if (!type) return 'slate'
  const map: Record<string, BadgeColor> = {
    Exact: 'green',
    Phrase: 'blue',
    Broad: 'amber',
    Auto: 'slate',
  }
  return map[type] ?? 'slate'
}

interface Props { brandId: string }

export default function KeywordsClient({ brandId }: Props) {
  const [data, setData] = useState<TargetingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'top' | 'wasted' | 'converters'>('top')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/brands/${brandId}/targeting`)
      if (r.ok) setData(await r.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [brandId])

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await fetch(`/api/brands/${brandId}/targeting`, { method: 'POST', body: fd })
      const json = await r.json()
      if (r.ok) {
        setUploadMsg(`✓ ${json.inserted} rows imported (${json.skipped} skipped)`)
        await load()
      } else {
        setUploadMsg(`✗ ${json.error}`)
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const tabs = [
    { key: 'top' as const, label: 'Top Spend', count: data?.topSpend?.length },
    { key: 'wasted' as const, label: '🔴 Wasted Spend', count: data?.wasted?.length },
    { key: 'converters' as const, label: '🏆 Top Converters', count: data?.topConverters?.length },
  ]

  return (
    <div className="space-y-5">
      {/* Upload bar */}
      <div className="flex items-center gap-3 bg-surface-card border border-border-default rounded-xl px-4 py-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">Upload Targeting Report</p>
          <p className="text-xs text-text-muted">
            Advertising Console → Reports → SP → Targeting (.xlsx)
          </p>
        </div>
        {uploadMsg && (
          <span className={`text-xs ${uploadMsg.startsWith('✓') ? 'text-data-positive' : 'text-data-negative'}`}>
            {uploadMsg}
          </span>
        )}
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={upload} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-1.5 bg-accent-primary hover:bg-accent-primary-hover disabled:opacity-50 text-text-on-brand text-sm font-medium rounded-lg transition-colors"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-text-muted py-8 text-center">Loading…</div>
      ) : !data?.topSpend?.length ? (
        <EmptyState
          icon="🔍"
          title="No targeting data yet"
          description="Upload a Targeting report above to get started."
        />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-surface-raised p-1 rounded-xl w-fit">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t.key
                    ? 'bg-surface-card shadow-sm text-text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {t.label}
                {t.count ? (
                  <span className="ml-1.5 text-xs text-text-muted">({t.count})</span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Tables */}
          {activeTab === 'top' && <TargetingTable rows={data.topSpend} type="spend" />}
          {activeTab === 'wasted' && (
            <div className="space-y-2">
              <p className="text-xs text-text-secondary">
                Keywords with spend but zero orders — candidates for negative targeting.
              </p>
              <TargetingTable rows={data.wasted} type="wasted" />
            </div>
          )}
          {activeTab === 'converters' && (
            <div className="space-y-2">
              <p className="text-xs text-text-secondary">
                Best converting keywords by ACOS (lowest first, minimum 1 order).
              </p>
              <TargetingTable rows={data.topConverters} type="converters" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TargetingTable({
  rows,
  type,
}: {
  rows: TargetingRow[]
  type: 'spend' | 'wasted' | 'converters'
}) {
  if (!rows?.length) return (
    <EmptyState
      icon="🔍"
      title="No targeting data yet"
      description="Upload a Targeting report above to get started."
    />
  )

  return (
    <DataTable headers={[
      { label: 'Keyword / Target' },
      { label: 'Match' },
      { label: 'Spend', align: 'right' },
      { label: 'Sales', align: 'right' },
      { label: 'ACOS', align: 'right' },
      { label: 'RoAS', align: 'right' },
      { label: 'Orders', align: 'right' },
      { label: 'Clicks', align: 'right' },
    ]}>
      {rows.map((r, i) => {
        const acosVal = r.acos ? (r.acos > 1 ? r.acos : r.acos * 100) : null
        const acosColor =
          acosVal === null ? 'text-text-secondary' : acosVal > 40 ? 'text-data-negative' : acosVal > 25 ? 'text-data-amber' : 'text-data-positive'

        return (
          <tr key={i} className="hover:bg-surface-raised transition-colors">
            <td className="px-4 py-2.5 font-medium text-text-primary max-w-[200px] truncate">
              {r.targeting ?? '—'}
            </td>
            <td className="px-3 py-2.5">
              <StatusBadge label={r.match_type ?? '—'} color={matchColor(r.match_type)} />
            </td>
            <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">₹{fmt(r.spend)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">
              {r.sales
                ? <span className="text-text-secondary">₹{fmt(r.sales)}</span>
                : <span className="text-data-negative">₹0</span>}
            </td>
            <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${acosColor}`}>
              {fmtAcos(r.acos)}
            </td>
            <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">
              {r.roas ? `${r.roas.toFixed(1)}x` : '—'}
            </td>
            <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{r.orders ?? '—'}</td>
            <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{r.clicks ?? '—'}</td>
          </tr>
        )
      })}
    </DataTable>
  )
}
