// app/app/(dashboard)/brands/[id]/settings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import SyncControls from '@/components/settings/SyncControls'
import ScheduleConfig from '@/components/settings/ScheduleConfig'
import DisconnectButton from '@/components/settings/DisconnectButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'

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
      <PageHeader
        title={`Settings — ${brand.name}`}
        breadcrumb={[
          { label: 'Command Center', href: '/dashboard' },
          { label: brand.name, href: `/brands/${id}` },
        ]}
      />

      {/* Sandbox banner */}
      {isSandbox && (
        <div className="mb-4 p-3 bg-data-amber/10 border border-border-default rounded-xl text-xs text-data-amber font-medium">
          🧪 Sandbox mode — SP-API calls use fixture data. Set <code>AMAZON_SANDBOX=false</code> for production.
        </div>
      )}

      {/* OAuth result banners */}
      {connected === 'true' && (
        <div className="mb-4 p-3 bg-data-positive/10 border border-border-default rounded-xl text-sm text-data-positive">
          ✅ Amazon account connected successfully.
        </div>
      )}
      {oauthError && (
        <div className="mb-4 p-3 bg-data-negative/10 border border-border-default rounded-xl text-sm text-data-negative">
          ❌ Connection failed: {oauthError.replace(/_/g, ' ')}. Please try again.
        </div>
      )}

      {/* Section 1: Amazon Connection */}
      <SectionCard title="Amazon Connection" padding="lg" className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-data-positive' : 'bg-border-default'}`} />
              <p className="text-sm font-medium text-text-primary">
                {isConnected ? 'Connected' : 'Not connected'}
              </p>
            </div>
            {isConnected && creds.last_sync_at && (
              <p className="text-xs text-text-muted mt-0.5 ml-4">
                Last sync: {new Date(creds.last_sync_at).toLocaleString('en-IN')}
              </p>
            )}
          </div>
          {isConnected ? (
            <DisconnectButton brandId={id} />
          ) : (
            <Link
              href={`/api/amazon/auth?brand_id=${id}`}
              className="text-sm bg-accent-primary text-text-on-brand font-semibold px-4 py-2 rounded-lg hover:bg-accent-primary-hover transition-colors"
            >
              Connect Amazon
            </Link>
          )}
        </div>
      </SectionCard>

      {/* Section 2: Sync Now */}
      <SectionCard title="Sync Now" padding="lg" className="mb-4">
        {!isConnected && (
          <p className="text-sm text-text-muted mb-3">Connect your Amazon account above to enable syncing.</p>
        )}
        <SyncControls
          brandId={id}
          isConnected={isConnected}
          lastLogs={recentLogs ?? []}
        />
      </SectionCard>

      {/* Section 3: Auto-sync Schedule */}
      <SectionCard
        title="Auto-sync Schedule"
        padding="lg"
        className={!isConnected ? 'opacity-50 pointer-events-none' : ''}
      >
        <p className="text-xs text-text-muted mb-4">
          {isConnected
            ? 'Scheduled syncs run automatically via Inngest.'
            : 'Connect Amazon above to configure auto-sync.'}
        </p>
        <ScheduleConfig brandId={id} initialSchedule={schedule} />
      </SectionCard>
    </div>
  )
}
