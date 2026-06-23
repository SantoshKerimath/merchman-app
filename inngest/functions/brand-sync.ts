import { createClient } from '@supabase/supabase-js'
import { inngest } from '../client'
import { evaluateAlerts } from '../../lib/alerts/evaluate'
import type { AlertConfig } from '../../lib/alerts/thresholds'

export const brandSync = inngest.createFunction(
  {
    id: 'brand-sync',
    retries: 3,
    triggers: [{ event: 'brand/sync.requested' }],
  },
  async ({ event, step }) => {
    const { brand_id, date_from, date_to, trigger } = event.data as {
      brand_id: string
      date_from: string
      date_to: string
      trigger: 'scheduled' | 'on_login'
    }

    const result = await step.run('call-sync-api', async () => {
      const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/brands/${brand_id}/sync`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-inngest-secret': process.env.INNGEST_INTERNAL_SECRET!,
        },
        body: JSON.stringify({ report_type: 'all', date_from, date_to, trigger }),
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(`Sync failed for brand ${brand_id} (${res.status}): ${JSON.stringify(body)}`)
      }
      return body as { inserted: number; skipped: number; api_calls_used: number }
    })

    await step.run('evaluate-alerts', async () => {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: cred } = await supabase
          .from('brand_credentials')
          .select('alert_config, brands!inner(name)')
          .eq('brand_id', brand_id)
          .single()

        const brandsData = cred?.brands as unknown as { name: string } | null
        const brandName = brandsData?.name ?? brand_id

        await evaluateAlerts(
          brand_id,
          brandName,
          (cred?.alert_config ?? null) as AlertConfig | null
        )
      } catch (err) {
        // Alert failure must NOT fail the sync
        console.error('[evaluate-alerts] error:', err)
      }
    })

    return { brand_id, date_from, date_to, trigger, ...result }
  }
)
