// app/components/settings/SyncControls.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SyncLog {
  report_type: string
  status: string
  rows_inserted: number | null
  completed_at: string | null
}

interface Props {
  brandId: string
  isConnected: boolean
  lastLogs: SyncLog[]
}

type SyncType = 'settlement' | 'advertising' | 'business'

const SYNC_LABELS: Record<SyncType, string> = {
  settlement: 'Sync Settlement',
  advertising: 'Sync Advertising',
  business: 'Sync Business Report',
}

export default function SyncControls({ brandId, isConnected, lastLogs }: Props) {
  const router = useRouter()
  const [syncing, setSyncing] = useState<SyncType | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})

  const logFor = (type: string) => lastLogs.find(l => l.report_type === type)

  async function handleSync(type: SyncType) {
    setSyncing(type)
    setResults(r => ({ ...r, [type]: '' }))

    const res = await fetch(`/api/brands/${brandId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_type: type }),
    })
    const data = await res.json() as { success: boolean; inserted?: number; error?: string }

    if (data.success) {
      setResults(r => ({ ...r, [type]: `✅ ${data.inserted} rows inserted` }))
      router.refresh()
    } else {
      setResults(r => ({ ...r, [type]: `❌ ${data.error}` }))
    }
    setSyncing(null)
  }

  return (
    <div className="space-y-3">
      {(['settlement', 'advertising', 'business'] as SyncType[]).map(type => {
        const log = logFor(type)
        return (
          <div key={type} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-700">{SYNC_LABELS[type]}</p>
              {log?.completed_at && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Last: {new Date(log.completed_at).toLocaleString('en-IN')}
                  {log.rows_inserted !== null && ` · ${log.rows_inserted} rows`}
                </p>
              )}
              {results[type] && (
                <p className="text-xs mt-0.5 text-slate-600">{results[type]}</p>
              )}
            </div>
            <button
              onClick={() => handleSync(type)}
              disabled={!isConnected || syncing === type}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0D9488] text-white hover:bg-teal-700 transition-colors disabled:opacity-40"
            >
              {syncing === type ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
