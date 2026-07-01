import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdAnalyticsClient from './AdAnalyticsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdAnalyticsPage({ params }: Props) {
  const { id: brandId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: brand } = await supabase
    .from('brands')
    .select('name')
    .eq('id', brandId)
    .single()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          {brand?.name ?? 'Brand'} — Ad Analytics
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Campaigns, keywords, and product placement performance from SP Targeting reports.
        </p>
      </div>
      <AdAnalyticsClient brandId={brandId} />
    </div>
  )
}
