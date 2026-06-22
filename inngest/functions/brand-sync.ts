import { inngest } from '../client'

export const brandSync = inngest.createFunction(
  {
    id: 'brand-sync',
    retries: 3,
    triggers: [
      {
        event: 'brand/sync.requested',
      },
    ],
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
        body: JSON.stringify({
          report_type: 'all',
          date_from,
          date_to,
          trigger,
        }),
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(
          `Sync failed for brand ${brand_id} (${res.status}): ${JSON.stringify(body)}`
        )
      }

      return body as { inserted: number; skipped: number; api_calls_used: number }
    })

    return {
      brand_id,
      date_from,
      date_to,
      trigger,
      ...result,
    }
  }
)
