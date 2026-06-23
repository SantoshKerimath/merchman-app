import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import AlertConfig, { ALERT_CONFIG_DEFAULTS } from '@/components/alerts/AlertConfig'

export default async function BrandAlertsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: brand } = await supabase
    .from('brands').select('id, name').eq('id', id).single()
  if (!brand) notFound()

  const { data: creds } = await supabase
    .from('brand_credentials').select('alert_config').eq('brand_id', id).single()

  // Not connected — no credentials row
  if (!creds) redirect('/settings')

  const initialConfig = {
    ...ALERT_CONFIG_DEFAULTS,
    ...(creds.alert_config as Record<string, unknown> ?? {}),
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <p className="text-sm text-slate-400 mb-1">
          <Link href="/settings" className="hover:text-slate-600">Brands</Link>
          {' › '}
          {brand.name}
          {' › '}
          Alert Config
        </p>
        <h1 className="text-2xl font-bold text-[#1E2761]">Alert Config — {brand.name}</h1>
        <p className="text-sm text-slate-500 mt-1">Thresholds are checked after every sync.</p>
      </div>
      <AlertConfig
        brandId={id}
        initialConfig={initialConfig as Parameters<typeof AlertConfig>[0]['initialConfig']}
      />
    </div>
  )
}
