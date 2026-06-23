'use client'

import { useState, useEffect, useRef } from 'react'

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

function fmtPct(n: number | null) {
  if (n === null || n === undefined) return '—'
  return `${(n * 100).toFixed(1)}%`
}

function fmtAcos(n: number | null) {
  if (n === null || n === undefined) return '—'
  // ACOS might be stored as 0–1 or 0–100
  const v = n > 1 ? n : n * 100
  return `${v.toFixed(1)}%`
}

function matchBadge(type: string | null) {
  if (!type) return null
  const colors: Record<string, string> = {
    Exact: 'bg-emerald-50 text-emerald-700',
    Phrase: 'bg-blue-50 text-blue-700',
    Broad: 'bg-amber-50 text-amber-700',
    Auto: 'bg-slate-100 text-slate-600',
  }
  const cls = colors[type] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cls}`}>{type}</span>
  )
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
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700">Upload Targeting Report</p>
          <p className="text-xs text-slate-400">
            Advertising Console → Reports → SP → Targeting (.xlsx)
          </p>
        </div>
        {uploadMsg && (
          <span className={`text-xs ${uploadMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>
            {uploadMsg}
          </span>
        )}
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={upload} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-4 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-200 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
      ) : !data?.topSpend?.length ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-sm font-medium text-slate-600">No targeting data yet</p>
          <p className="text-xs text-slate-400 mt-1">Upload a Targeting report above to get started</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t.key
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
                {t.count ? (
                  <span className="ml-1.5 text-xs text-slate-400">({t.count})</span>
                ) : null}
              </button>
            ))}
          </div>

          {/* Tables */}
          {activeTab === 'top' && <TargetingTable rows={data.topSpend} type="spend" />}
          {activeTab === 'wasted' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Keywords with spend but zero orders — candidates for negative targeting.
              </p>
              <TargetingTable rows={data.wasted} type="wasted" />
            </div>
          )}
          {activeTab === 'converters' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
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
  if (!rows?.length) return <p className="text-sm text-slate-400 py-4">No data</p>

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 font-medium">
              <th className="text-left px-4 py-2.5">Keyword / Target</th>
              <th className="text-left px-3 py-2.5">Match</th>
              <th className="text-right px-3 py-2.5">Spend</th>
              <th className="text-right px-3 py-2.5">Sales</th>
              <th className="text-right px-3 py-2.5">ACOS</th>
              <th className="text-right px-3 py-2.5">RoAS</th>
              <th className="text-right px-3 py-2.5">Orders</th>
              <th className="text-right px-3 py-2.5">Clicks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r, i) => {
              const acosVal = r.acos ? (r.acos > 1 ? r.acos : r.acos * 100) : null
              const acosColor =
                acosVal === null ? '' : acosVal > 40 ? 'text-red-600' : acosVal > 25 ? 'text-amber-600' : 'text-emerald-600'

              return (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[200px] truncate">
                    {r.targeting ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">{matchBadge(r.match_type)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">₹{fmt(r.spend)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {r.sales ? `₹${fmt(r.sales)}` : <span className="text-red-500">₹0</span>}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-medium ${acosColor}`}>
                    {fmtAcos(r.acos)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {r.roas ? `${r.roas.toFixed(1)}x` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{r.orders ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{r.clicks ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
