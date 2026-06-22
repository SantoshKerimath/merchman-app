import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { brandSync } from '@/inngest/functions/brand-sync'
import { scheduledSync } from '@/inngest/functions/scheduled-sync'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [brandSync, scheduledSync],
})
