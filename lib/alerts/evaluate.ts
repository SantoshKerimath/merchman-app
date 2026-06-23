import { createClient } from '@supabase/supabase-js'
import {
  type AlertConfig,
  type AlertType,
  mergeWithDefaults,
  computeSeverity,
  formatMessage,
} from './thresholds'
import { notifyWhatsApp } from './notify'

interface AlertInsert {
  brand_id: string
  type: string
  severity: string
  message: string
  metric_value: number
  threshold: number
}

function dateStrDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400 * 1000).toISOString().split('T')[0]
}

export async function evaluateAlerts(
  brandId: string,
  brandName: string,
  rawConfig: AlertConfig | null
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const config = mergeWithDefaults(rawConfig)
  const today = new Date().toISOString().split('T')[0]
  const toInsert: AlertInsert[] = []

  // ── ACOS high ──────────────────────────────────────────────────────────
  if (config.acos_high.enabled) {
    const { period_days, warning_threshold, critical_threshold, min_spend = 500 } = config.acos_high
    const since = dateStrDaysAgo(period_days)

    const { data } = await supabase
      .from('ppc_data')
      .select('spend, sales')
      .eq('brand_id', brandId)
      .gte('start_date', since)
      .lte('start_date', today)

    if (data?.length) {
      const totalSpend = data.reduce((s, r) => s + (r.spend ?? 0), 0)
      const totalSales = data.reduce((s, r) => s + (r.sales ?? 0), 0)

      if (totalSpend >= min_spend && totalSales > 0) {
        const acos = (totalSpend / totalSales) * 100
        const severity = computeSeverity('acos_high', acos, config.acos_high)
        if (severity) {
          const threshold = severity === 'critical' ? critical_threshold : warning_threshold
          toInsert.push({
            brand_id: brandId,
            type: 'acos_high',
            severity,
            message: formatMessage('acos_high', severity, brandName, acos, threshold, period_days),
            metric_value: Math.round(acos * 10) / 10,
            threshold,
          })
        }
      }
    }
  }

  // ── Sales drop ─────────────────────────────────────────────────────────
  if (config.sales_drop.enabled) {
    const { period_days, warning_threshold, critical_threshold } = config.sales_drop
    const currentStart = dateStrDaysAgo(period_days)
    const priorStart = dateStrDaysAgo(period_days * 2)

    const [{ data: curr }, { data: prior }] = await Promise.all([
      supabase.from('settlements').select('product_sales')
        .eq('brand_id', brandId).gte('transaction_date', currentStart).lte('transaction_date', today),
      supabase.from('settlements').select('product_sales')
        .eq('brand_id', brandId).gte('transaction_date', priorStart).lt('transaction_date', currentStart),
    ])

    const currentSales = (curr ?? []).reduce((s, r) => s + (r.product_sales ?? 0), 0)
    const priorSales = (prior ?? []).reduce((s, r) => s + (r.product_sales ?? 0), 0)

    if (priorSales > 0) {
      const dropPct = ((priorSales - currentSales) / priorSales) * 100
      const severity = computeSeverity('sales_drop', dropPct, config.sales_drop)
      if (severity) {
        const threshold = severity === 'critical' ? critical_threshold : warning_threshold
        toInsert.push({
          brand_id: brandId,
          type: 'sales_drop',
          severity,
          message: formatMessage('sales_drop', severity, brandName, dropPct, threshold, period_days),
          metric_value: Math.round(dropPct * 10) / 10,
          threshold,
        })
      }
    }
  }

  // ── ROAS drop ──────────────────────────────────────────────────────────
  if (config.roas_drop.enabled) {
    const { period_days, warning_threshold, critical_threshold, min_spend = 500 } = config.roas_drop
    const since = dateStrDaysAgo(period_days)

    const { data } = await supabase
      .from('ppc_data')
      .select('spend, sales')
      .eq('brand_id', brandId)
      .gte('start_date', since)
      .lte('start_date', today)

    if (data?.length) {
      const totalSpend = data.reduce((s, r) => s + (r.spend ?? 0), 0)
      const totalSales = data.reduce((s, r) => s + (r.sales ?? 0), 0)

      if (totalSpend >= min_spend) {
        const roas = totalSpend > 0 ? totalSales / totalSpend : 0
        const severity = computeSeverity('roas_drop', roas, config.roas_drop)
        if (severity) {
          const threshold = severity === 'critical' ? critical_threshold : warning_threshold
          toInsert.push({
            brand_id: brandId,
            type: 'roas_drop',
            severity,
            message: formatMessage('roas_drop', severity, brandName, roas, threshold, period_days),
            metric_value: Math.round(roas * 100) / 100,
            threshold,
          })
        }
      }
    }
  }

  // ── Insert + notify ────────────────────────────────────────────────────
  if (toInsert.length > 0) {
    const { data: inserted } = await supabase
      .from('alerts')
      .insert(toInsert)
      .select('id, message, severity')

    if (config.whatsapp_number && inserted) {
      for (const alert of inserted) {
        await notifyWhatsApp(alert.message, config.whatsapp_number)
        await supabase.from('alerts').update({ notified_at: new Date().toISOString() }).eq('id', alert.id)
      }
    }
  }
}
