// app/app/(dashboard)/brands/[id]/settings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import SyncControls from '@/components/settings/SyncControls'
import ScheduleConfig from '@/components/settings/ScheduleConfig'
import DisconnectButton from '@/components/settings/DisconnectButton'

interface SyncSchedule {
  type: 'manual' | 'daily' | 'weekly' | 'custom' | 'on_login'
  days: number[]
  time: string
  on_login: boolean
}

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

  const defaultSchedule: SyncSchedule = {
    type: 'manual',
    days: [],
    time: '09:00',
    on_login: false,
  }
  const schedule = (creds?.sync_schedule as unknown as SyncSchedule) ?? defaultSchedule

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
            <DisconnectButton brandId={id} />
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
      <section className={`bg-white border border-slate-200 rounded-2xl p-6 ${!isConnected ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#1E2761]">Auto-sync Schedule</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isConnected
              ? 'Scheduled syncs run automatically via Inngest.'
              : 'Connect Amazon above to configure auto-sync.'}
          </p>
        </div>
        <ScheduleConfig brandId={id} initialSchedule={schedule} />
      </section>
    </div>
  )
}
