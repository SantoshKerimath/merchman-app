## Task 10: Settings Page + Client Components

**Files:**
- Create: `app/components/settings/SyncControls.tsx`
- Create: `app/components/settings/ScheduleConfig.tsx`
- Create: `app/app/(dashboard)/brands/[id]/settings/page.tsx`

**Interfaces:**
- Consumes: `brand_credentials` table, `sync_logs` table (last entry per report type per brand), `POST /api/brands/[id]/sync`, `PATCH /api/brands/[id]/credentials`, `DELETE /api/brands/[id]/credentials`, `GET /api/amazon/auth`
- Produces: Settings page accessible at `/brands/[id]/settings`

- [ ] **Step 1: Create `app/components/settings/SyncControls.tsx`**

```typescript
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
    const data = await res.json()

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
```

- [ ] **Step 2: Create `app/components/settings/ScheduleConfig.tsx`**

```typescript
// app/components/settings/ScheduleConfig.tsx
'use client'
import { useState } from 'react'

interface SyncSchedule {
  type: 'manual' | 'daily' | 'weekly' | 'custom'
  days: number[]
  time: string
  on_login: boolean
}

interface Props {
  brandId: string
  initialSchedule: SyncSchedule
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ScheduleConfig({ brandId, initialSchedule }: Props) {
  const [schedule, setSchedule] = useState<SyncSchedule>(initialSchedule)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(updated: SyncSchedule) {
    setSchedule(updated)
    setSaving(true)
    setSaved(false)

    await fetch(`/api/brands/${brandId}/credentials`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync_schedule: updated }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleDay(day: number) {
    const days = schedule.days.includes(day)
      ? schedule.days.filter(d => d !== day)
      : [...schedule.days, day].sort()
    save({ ...schedule, days })
  }

  return (
    <div className="space-y-4">
      {/* Schedule type */}
      <div className="grid grid-cols-4 gap-2">
        {(['manual', 'daily', 'weekly', 'custom'] as const).map(t => (
          <button
            key={t}
            onClick={() => save({ ...schedule, type: t })}
            className={`py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
              schedule.type === t
                ? 'bg-[#0D9488] text-white border-[#0D9488]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Day picker for custom */}
      {schedule.type === 'custom' && (
        <div className="flex gap-2 flex-wrap">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              className={`w-10 h-10 rounded-full text-xs font-semibold border transition-colors ${
                schedule.days.includes(i)
                  ? 'bg-[#0D9488] text-white border-[#0D9488]'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Time picker */}
      {schedule.type !== 'manual' && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-500 w-16">Time</label>
          <input
            type="time"
            value={schedule.time}
            onChange={e => save({ ...schedule, time: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      )}

      {/* On-login toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Sync on login</p>
          <p className="text-xs text-slate-400">Auto-sync when you open MerchMan</p>
        </div>
        <button
          onClick={() => save({ ...schedule, on_login: !schedule.on_login })}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            schedule.on_login ? 'bg-[#0D9488]' : 'bg-slate-200'
          }`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            schedule.on_login ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Save status */}
      {(saving || saved) && (
        <p className="text-xs text-teal-600">{saving ? 'Saving…' : '✓ Saved'}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `app/app/(dashboard)/brands/[id]/settings/page.tsx`**

```typescript
// app/app/(dashboard)/brands/[id]/settings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import SyncControls from '@/components/settings/SyncControls'
import ScheduleConfig from '@/components/settings/ScheduleConfig'

export default async function BrandSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { id } = await params
  const { connected, error: oauthError } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: brand } = await supabase
    .from('brands').select('id, name').eq('id', id).single()
  if (!brand) notFound()

  const { data: creds } = await supabase
    .from('brand_credentials').select('*').eq('brand_id', id).single()

  const { data: recentLogs } = await supabase
    .from('sync_logs')
    .select('report_type, status, rows_inserted, completed_at')
    .eq('brand_id', id)
    .eq('status', 'done')
    .order('completed_at', { ascending: false })
    .limit(10)

  const isConnected = !!creds
  const isSandbox = process.env.AMAZON_SANDBOX === 'true'

  const defaultSchedule = {
    type: 'manual' as const,
    days: [],
    time: '09:00',
    on_login: false,
  }
  const schedule = (creds?.sync_schedule as typeof defaultSchedule) ?? defaultSchedule

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-slate-400">
          <Link href="/dashboard" className="hover:text-slate-600">Command Center</Link>{' '}
          ›{' '}
          <Link href={`/brands/${id}`} className="hover:text-slate-600">{brand.name}</Link>{' '}
          › Settings
        </p>
        <h1 className="text-2xl font-bold text-[#1E2761] mt-0.5">Settings — {brand.name}</h1>
      </div>

      {/* Sandbox banner */}
      {isSandbox && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
          🧪 Sandbox mode — SP-API calls use fixture data. Set <code>AMAZON_SANDBOX=false</code> for production.
        </div>
      )}

      {/* OAuth result banners */}
      {connected === 'true' && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-700">
          ✅ Amazon account connected successfully.
        </div>
      )}
      {oauthError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          ❌ Connection failed: {oauthError.replace(/_/g, ' ')}. Please try again.
        </div>
      )}

      {/* Section 1: Amazon Connection */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        <h2 className="text-base font-semibold text-[#1E2761] mb-4">Amazon Connection</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-teal-500' : 'bg-slate-300'}`} />
              <p className="text-sm font-medium text-slate-700">
                {isConnected ? 'Connected' : 'Not connected'}
              </p>
            </div>
            {isConnected && creds.last_sync_at && (
              <p className="text-xs text-slate-400 mt-0.5 ml-4">
                Last sync: {new Date(creds.last_sync_at).toLocaleString('en-IN')}
              </p>
            )}
          </div>
          {isConnected ? (
            <form action={`/api/brands/${id}/credentials`} method="POST">
              <Link
                href={`/api/brands/${id}/credentials`}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
                onClick={async (e) => {
                  e.preventDefault()
                  if (!confirm('Disconnect Amazon account? Scheduled syncs will stop.')) return
                  await fetch(`/api/brands/${id}/credentials`, { method: 'DELETE' })
                  window.location.reload()
                }}
              >
                Disconnect
              </Link>
            </form>
          ) : (
            <Link
              href={`/api/amazon/auth?brand_id=${id}`}
              className="text-sm bg-[#0D9488] text-white font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Connect Amazon
            </Link>
          )}
        </div>
      </section>

      {/* Section 2: Sync Now */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-4">
        <h2 className="text-base font-semibold text-[#1E2761] mb-4">Sync Now</h2>
        {!isConnected && (
          <p className="text-sm text-slate-400 mb-3">Connect your Amazon account above to enable syncing.</p>
        )}
        <SyncControls
          brandId={id}
          isConnected={isConnected}
          lastLogs={recentLogs ?? []}
        />
      </section>

      {/* Section 3: Auto-sync Schedule */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#1E2761]">Auto-sync Schedule</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Scheduled syncs run automatically. Powered by Inngest (coming soon).
          </p>
        </div>
        <ScheduleConfig brandId={id} initialSchedule={schedule} />
      </section>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd app && npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 5: Manual verify**

Navigate to `/brands/[any-id]/settings` in browser. Confirm: sandbox banner visible, "Not connected" status, "Connect Amazon" button present, sync buttons disabled, schedule controls work.

- [ ] **Step 6: Commit**

```bash
cd app && git add components/settings/ app/\(dashboard\)/brands/\[id\]/settings/ && git commit -m "feat(ui): settings page — Amazon connection, sync now, schedule config"
```

---

