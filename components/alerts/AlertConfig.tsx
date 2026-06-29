'use client'
import { useState } from 'react'

interface AlertTypeConfig {
  enabled: boolean
  warning_threshold: number
  critical_threshold: number
  period_days: number
  min_spend?: number
}

interface AlertConfigData {
  acos_high: AlertTypeConfig
  sales_drop: AlertTypeConfig
  roas_drop: AlertTypeConfig
  whatsapp_number: string
}

export const ALERT_CONFIG_DEFAULTS: AlertConfigData = {
  acos_high:  { enabled: true, warning_threshold: 30, critical_threshold: 40, period_days: 7, min_spend: 500 },
  sales_drop: { enabled: true, warning_threshold: 20, critical_threshold: 35, period_days: 7 },
  roas_drop:  { enabled: true, warning_threshold: 2.0, critical_threshold: 1.5, period_days: 7, min_spend: 500 },
  whatsapp_number: '',
}

interface Props {
  brandId: string
  initialConfig: AlertConfigData
}

export default function AlertConfig({ brandId, initialConfig }: Props) {
  const [config, setConfig] = useState<AlertConfigData>(initialConfig)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch(`/api/brands/${brandId}/credentials`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_config: config }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Save failed')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  function updateType<K extends keyof Omit<AlertConfigData, 'whatsapp_number'>>(
    type: K,
    field: keyof AlertTypeConfig,
    value: number | boolean
  ) {
    setConfig(c => ({ ...c, [type]: { ...c[type], [field]: value } }))
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp number */}
      <div className="bg-surface-card border border-border-default rounded-2xl p-6">
        <h2 className="text-base font-semibold text-text-primary mb-4">WhatsApp Notifications</h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-text-secondary w-40">WhatsApp number</label>
          <input
            type="tel"
            value={config.whatsapp_number}
            onChange={e => setConfig(c => ({ ...c, whatsapp_number: e.target.value }))}
            placeholder="+91XXXXXXXXXX"
            className="flex-1 max-w-xs border border-border-default rounded-lg px-3 py-1.5 text-sm bg-surface-card text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
        <p className="text-xs text-text-muted mt-2">Leave blank to disable WhatsApp alerts.</p>
      </div>

      <AlertSection
        title="ACOS Alert"
        description="Fires when average ACOS over the period exceeds threshold. (Requires min spend to avoid false alarms on sparse ad weeks.)"
        config={config.acos_high}
        warningLabel="Warning ACOS %"
        criticalLabel="Critical ACOS %"
        showMinSpend
        onChange={(field, value) => updateType('acos_high', field, value)}
      />

      <AlertSection
        title="Sales Drop Alert"
        description="Fires when sales this period drop by % vs the prior same-length period."
        config={config.sales_drop}
        warningLabel="Warning drop %"
        criticalLabel="Critical drop %"
        onChange={(field, value) => updateType('sales_drop', field, value)}
      />

      <AlertSection
        title="ROAS Drop Alert"
        description="Fires when average ROAS drops below threshold. (Requires min spend.)"
        config={config.roas_drop}
        warningLabel="Warning ROAS (min)"
        criticalLabel="Critical ROAS (min)"
        showMinSpend
        onChange={(field, value) => updateType('roas_drop', field, value)}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-accent-primary text-text-on-brand text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-accent-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save alert config'}
        </button>
        {saved && <p className="text-sm text-data-positive font-medium">✓ Saved</p>}
        {error && <p className="text-sm text-data-negative">{error}</p>}
      </div>
    </div>
  )
}

function AlertSection({
  title,
  description,
  config,
  warningLabel,
  criticalLabel,
  showMinSpend,
  onChange,
}: {
  title: string
  description: string
  config: AlertTypeConfig
  warningLabel: string
  criticalLabel: string
  showMinSpend?: boolean
  onChange: (field: keyof AlertTypeConfig, value: number | boolean) => void
}) {
  return (
    <div className={`bg-surface-card border border-border-default rounded-2xl p-6 transition-opacity ${!config.enabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <button
          onClick={() => onChange('enabled', !config.enabled)}
          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${config.enabled ? 'bg-accent-primary' : 'bg-surface-raised'}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-surface-card shadow transform transition-transform mt-0.5 ${config.enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
      <p className="text-xs text-text-muted mb-4">{description}</p>

      <div className="grid grid-cols-2 gap-4">
        <NumField label={warningLabel} value={config.warning_threshold} onChange={v => onChange('warning_threshold', v)} />
        <NumField label={criticalLabel} value={config.critical_threshold} onChange={v => onChange('critical_threshold', v)} />
        <div>
          <label className="block text-xs text-text-secondary mb-1">Evaluation period</label>
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => onChange('period_days', d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  config.period_days === d
                    ? 'bg-accent-primary text-text-on-brand border-accent-primary'
                    : 'bg-surface-card text-text-secondary border-border-default hover:border-accent-primary'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {showMinSpend && (
          <NumField
            label="Min spend ₹ (skip if below)"
            value={config.min_spend ?? 500}
            onChange={v => onChange('min_spend', v)}
          />
        )}
      </div>
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step="0.1"
        className="w-full border border-border-default rounded-lg px-3 py-1.5 text-sm bg-surface-card text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
      />
    </div>
  )
}
