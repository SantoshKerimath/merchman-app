'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import CampaignCharts  from '@/components/adanalytics/CampaignCharts'
import TargetingCharts from '@/components/adanalytics/TargetingCharts'
import AdTable         from '@/components/adanalytics/AdTable'
import { EmptyState }  from '@/components/ui/EmptyState'
import type { CampaignRow, TargetingViewRow } from '@/lib/adanalytics'

type Tab = 'campaigns' | 'targeting'

function fmt(d: Date): string { return d.toISOString().split('T')[0] }
function last30(): { from: string; to: string } {
  const to   = new Date()
  const from = new Date(); from.setDate(from.getDate() - 30)
  return { from: fmt(from), to: fmt(to) }
}

interface Props { brandId: string }

export default function AdAnalyticsClient({ brandId }: Props) {
  const [tab, setTab]             = useState<Tab>('campaigns')
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [targeting, setTargeting] = useState<TargetingViewRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [dateRange, setDateRange] = useState(last30)
  const [fromInput, setFromInput] = useState(last30().from)
  const [toInput, setToInput]     = useState(last30().to)

  const load = useCallback(async (view: Tab, from: string, to: string) => {
    setLoading(true)
    try {
      const r = await fetch(
        `/api/brands/${brandId}/targeting?view=${view}&from=${from}&to=${to}`
      )
      if (!r.ok) return
      const data = await r.json()
      if (view === 'campaigns') setCampaigns(data as CampaignRow[])
      else                       setTargeting(data as TargetingViewRow[])
    } finally {
      setLoading(false)
    }
  }, [brandId])

  // Fetch both views on mount and when dateRange changes
  useEffect(() => {
    const { from, to } = dateRange
    Promise.all([
      load('campaigns', from, to),
      fetch(`/api/brands/${brandId}/targeting?view=targeting&from=${from}&to=${to}`)
        .then(r => r.json()).then(d => setTargeting(d as TargetingViewRow[])),
    ]).finally(() => setLoading(false))
  }, [brandId, dateRange, load])

  function applyDates() {
    if (!fromInput || !toInput) return
    setDateRange({ from: fromInput, to: toInput })
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadMsg('')
    const fd = new FormData(); fd.append('file', file)
    try {
      const r = await fetch(`/api/brands/${brandId}/targeting`, { method: 'POST', body: fd })
      const json = await r.json()
      if (r.ok) {
        setUploadMsg(`✓ ${json.inserted} rows imported`)
        // Reload both views
        const { from, to } = dateRange
        await Promise.all([
          load('campaigns', from, to),
          fetch(`/api/brands/${brandId}/targeting?view=targeting&from=${from}&to=${to}`)
            .then(r2 => r2.json()).then(d => setTargeting(d as TargetingViewRow[])),
        ])
      } else {
        setUploadMsg(`✗ ${json.error}`)
      }
    } finally {
      setUploading(false); e.target.value = ''
    }
  }

  const hasData = campaigns.length > 0 || targeting.length > 0

  return (
    <div className="space-y-5">
      {/* Upload bar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface-card border border-border-default rounded-xl px-4 py-3">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium text-text-primary">Upload SP Targeting Report</p>
          <p className="text-xs text-text-muted">Advertising Console → Reports → Sponsored Products → Targeting (.xlsx)</p>
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

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'Last 7d',  fn: () => { const t = new Date(), f = new Date(); f.setDate(f.getDate()-7);  return { from: fmt(f), to: fmt(t) } } },
          { label: 'Last 30d', fn: () => last30() },
          { label: 'MTD',      fn: () => { const n = new Date(); return { from: fmt(new Date(n.getFullYear(), n.getMonth(), 1)), to: fmt(n) } } },
        ].map(p => (
          <button
            key={p.label}
            onClick={() => { const r = p.fn(); setFromInput(r.from); setToInput(r.to); setDateRange(r) }}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              dateRange.from === p.fn().from && dateRange.to === p.fn().to
                ? 'bg-surface-sidebar text-text-on-brand border-transparent'
                : 'bg-surface-card border-border-default text-text-secondary hover:border-accent-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
        <input
          type="date" value={fromInput} onChange={e => setFromInput(e.target.value)}
          className="px-2 py-1.5 text-xs bg-surface-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <span className="text-text-muted text-xs">→</span>
        <input
          type="date" value={toInput} onChange={e => setToInput(e.target.value)}
          className="px-2 py-1.5 text-xs bg-surface-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <button
          onClick={applyDates}
          className="px-3 py-1.5 text-xs bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand rounded-lg transition-colors"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-text-muted py-8 text-center">Loading…</div>
      ) : !hasData ? (
        <EmptyState
          icon="📊"
          title="No ad data for this period"
          description="Upload a Sponsored Products Targeting report above to get started."
        />
      ) : (
        <>
          {/* Tab switcher */}
          <div className="flex gap-1 bg-surface-raised p-1 rounded-xl w-fit">
            {(['campaigns', 'targeting'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                  tab === t
                    ? 'bg-surface-card shadow-sm text-text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {t === 'campaigns' ? `Campaigns (${campaigns.length})` : `Targeting (${targeting.length})`}
              </button>
            ))}
          </div>

          {/* Charts */}
          {tab === 'campaigns'
            ? <CampaignCharts  campaigns={campaigns} />
            : <TargetingCharts rows={targeting} />
          }

          {/* Table */}
          <AdTable
            rows={(tab === 'campaigns' ? campaigns : targeting) as unknown as Record<string, unknown>[]}
            tab={tab}
          />
        </>
      )}
    </div>
  )
}
