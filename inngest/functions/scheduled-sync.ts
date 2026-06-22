import { createClient } from '@supabase/supabase-js'
import { inngest } from '../client'

interface SyncSchedule {
  type: 'manual' | 'daily' | 'weekly' | 'custom' | 'on_login'
  days: number[]
  time: string
}

interface BrandCred {
  brand_id: string
  sync_schedule: SyncSchedule
  last_sync_at: string | null
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function istToday(): { dateStr: string; dayOfWeek: number } {
  const nowUtcMs = Date.now()
  const istOffsetMs = 5.5 * 60 * 60 * 1000
  const istDate = new Date(nowUtcMs + istOffsetMs)
  const year = istDate.getUTCFullYear()
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(istDate.getUTCDate()).padStart(2, '0')
  return {
    dateStr: `${year}-${month}-${day}`,
    dayOfWeek: istDate.getUTCDay(),
  }
}

export const scheduledSync = inngest.createFunction(
  {
    id: 'scheduled-brand-sync',
    triggers: [
      {
        cron: '0 19 * * *',
      },
    ],
  },
  async ({ step }) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: creds, error } = await supabase
      .from('brand_credentials')
      .select('brand_id, sync_schedule, last_sync_at')
      .neq('sync_schedule->>type', 'manual')
      .neq('sync_schedule->>type', 'on_login')

    if (error) throw new Error(`Failed to fetch brand_credentials: ${error.message}`)
    if (!creds?.length) return { synced: 0, skipped: 0 }

    const { dateStr: todayStr, dayOfWeek: todayDow } = istToday()
    const yesterdayStr = toDateStr(new Date(Date.now() - 86400 * 1000))
    const sevenDaysAgoStr = toDateStr(new Date(Date.now() - 7 * 86400 * 1000))

    const events: Array<{
      name: 'brand/sync.requested'
      data: { brand_id: string; date_from: string; date_to: string; trigger: 'scheduled' }
    }> = []

    for (const cred of creds as BrandCred[]) {
      const { type, days } = cred.sync_schedule
      let shouldSync = false
      let date_from = sevenDaysAgoStr

      if (type === 'daily') {
        shouldSync = true
        date_from = yesterdayStr
      } else if (type === 'weekly') {
        shouldSync = (days[0] ?? 1) === todayDow
        date_from = sevenDaysAgoStr
      } else if (type === 'custom') {
        shouldSync = days.includes(todayDow)
        date_from = sevenDaysAgoStr
      }

      if (shouldSync) {
        events.push({
          name: 'brand/sync.requested',
          data: {
            brand_id: cred.brand_id,
            date_from,
            date_to: todayStr,
            trigger: 'scheduled',
          },
        })
      }
    }

    if (events.length > 0) {
      await step.sendEvent('dispatch-brand-syncs', events)
    }

    return { synced: events.length, skipped: (creds.length) - events.length }
  }
)
