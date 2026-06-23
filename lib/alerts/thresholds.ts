export type AlertType = 'acos_high' | 'sales_drop' | 'roas_drop'
export type AlertSeverity = 'warning' | 'critical'

export interface AlertTypeConfig {
  enabled: boolean
  warning_threshold: number
  critical_threshold: number
  period_days: number
  min_spend?: number
}

export interface AlertConfig {
  acos_high?: Partial<AlertTypeConfig>
  sales_drop?: Partial<AlertTypeConfig>
  roas_drop?: Partial<AlertTypeConfig>
  whatsapp_number?: string
}

export interface MergedConfig {
  acos_high: AlertTypeConfig
  sales_drop: AlertTypeConfig
  roas_drop: AlertTypeConfig
  whatsapp_number?: string
}

export const DEFAULTS: Record<AlertType, AlertTypeConfig> = {
  acos_high:  { enabled: true, warning_threshold: 30, critical_threshold: 40, period_days: 7, min_spend: 500 },
  sales_drop: { enabled: true, warning_threshold: 20, critical_threshold: 35, period_days: 7 },
  roas_drop:  { enabled: true, warning_threshold: 2.0, critical_threshold: 1.5, period_days: 7, min_spend: 500 },
}

export function mergeWithDefaults(raw: AlertConfig | null): MergedConfig {
  return {
    acos_high:  { ...DEFAULTS.acos_high,  ...(raw?.acos_high  ?? {}) },
    sales_drop: { ...DEFAULTS.sales_drop, ...(raw?.sales_drop ?? {}) },
    roas_drop:  { ...DEFAULTS.roas_drop,  ...(raw?.roas_drop  ?? {}) },
    whatsapp_number: raw?.whatsapp_number,
  }
}

export function computeSeverity(
  type: AlertType,
  value: number,
  config: AlertTypeConfig
): AlertSeverity | null {
  if (type === 'acos_high' || type === 'sales_drop') {
    if (value >= config.critical_threshold) return 'critical'
    if (value >= config.warning_threshold) return 'warning'
    return null
  }
  if (type === 'roas_drop') {
    if (value <= config.critical_threshold) return 'critical'
    if (value <= config.warning_threshold) return 'warning'
    return null
  }
  return null
}

export function formatMessage(
  type: AlertType,
  severity: AlertSeverity,
  brandName: string,
  value: number,
  threshold: number,
  periodDays: number
): string {
  const emoji = severity === 'critical' ? '🚨' : '⚠️'
  const label = severity === 'critical' ? 'critical' : 'warning'

  if (type === 'acos_high') {
    return `${emoji} ${brandName} ACOS is ${value.toFixed(1)}% (last ${periodDays}d) — above ${threshold}% ${label} threshold.`
  }
  if (type === 'sales_drop') {
    return `${emoji} ${brandName} sales dropped ${value.toFixed(1)}% vs prior ${periodDays}d — above ${threshold}% ${label} threshold.`
  }
  // roas_drop
  return `${emoji} ${brandName} ROAS is ${value.toFixed(2)} (last ${periodDays}d) — below ${threshold} ${label} threshold.`
}
