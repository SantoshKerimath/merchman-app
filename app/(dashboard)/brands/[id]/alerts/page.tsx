import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import AlertConfig, { ALERT_CONFIG_DEFAULTS } from '@/components/alerts/AlertConfig'
import { PageHeader } from '@/components/ui/PageHeader'

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
      <PageHeader
        title={`Alert Config — ${brand.name}`}
        breadcrumb={[
          { label: 'Brands', href: '/settings' },
          { label: brand.name, href: `/brands/${id}` },
        ]}
        className="mb-2"
      />
      <p className="text-sm text-text-secondary mb-6">Thresholds are checked after every sync.</p>
      <AlertConfig
        brandId={id}
        initialConfig={initialConfig as Parameters<typeof AlertConfig>[0]['initialConfig']}
      />
    </div>
  )
}
