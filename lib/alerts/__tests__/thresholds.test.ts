import { describe, it, expect } from 'vitest'
import { computeSeverity, formatMessage, mergeWithDefaults, DEFAULTS } from '../thresholds'

describe('mergeWithDefaults', () => {
  it('returns defaults when config is null', () => {
    const result = mergeWithDefaults(null)
    expect(result.acos_high).toEqual(DEFAULTS.acos_high)
    expect(result.sales_drop).toEqual(DEFAULTS.sales_drop)
    expect(result.roas_drop).toEqual(DEFAULTS.roas_drop)
    expect(result.whatsapp_number).toBeUndefined()
  })

  it('merges partial config over defaults', () => {
    const result = mergeWithDefaults({ acos_high: { warning_threshold: 25 } })
    expect(result.acos_high.warning_threshold).toBe(25)
    expect(result.acos_high.critical_threshold).toBe(40)
    expect(result.acos_high.period_days).toBe(7)
  })

  it('passes through whatsapp_number', () => {
    const result = mergeWithDefaults({ whatsapp_number: '+919999999999' })
    expect(result.whatsapp_number).toBe('+919999999999')
  })
})

describe('computeSeverity — acos_high', () => {
  it('returns null when acos below warning', () => {
    expect(computeSeverity('acos_high', 25, DEFAULTS.acos_high)).toBeNull()
  })
  it('returns warning when acos >= warning_threshold and < critical', () => {
    expect(computeSeverity('acos_high', 32, DEFAULTS.acos_high)).toBe('warning')
  })
  it('returns critical when acos >= critical_threshold', () => {
    expect(computeSeverity('acos_high', 45, DEFAULTS.acos_high)).toBe('critical')
  })
  it('returns critical not warning when both thresholds breached', () => {
    expect(computeSeverity('acos_high', 99, DEFAULTS.acos_high)).toBe('critical')
  })
})

describe('computeSeverity — sales_drop', () => {
  it('returns null when drop below warning', () => {
    expect(computeSeverity('sales_drop', 10, DEFAULTS.sales_drop)).toBeNull()
  })
  it('returns warning when drop >= warning_threshold', () => {
    expect(computeSeverity('sales_drop', 22, DEFAULTS.sales_drop)).toBe('warning')
  })
  it('returns critical when drop >= critical_threshold', () => {
    expect(computeSeverity('sales_drop', 40, DEFAULTS.sales_drop)).toBe('critical')
  })
})

describe('computeSeverity — roas_drop', () => {
  it('returns null when roas above warning', () => {
    expect(computeSeverity('roas_drop', 3.0, DEFAULTS.roas_drop)).toBeNull()
  })
  it('returns warning when roas <= warning_threshold and > critical', () => {
    expect(computeSeverity('roas_drop', 1.8, DEFAULTS.roas_drop)).toBe('warning')
  })
  it('returns critical when roas <= critical_threshold', () => {
    expect(computeSeverity('roas_drop', 1.2, DEFAULTS.roas_drop)).toBe('critical')
  })
})

describe('formatMessage', () => {
  it('formats acos_high warning', () => {
    expect(formatMessage('acos_high', 'warning', 'Kridlo', 32.5, 30, 7))
      .toBe('⚠️ Kridlo ACOS is 32.5% (last 7d) — above 30% warning threshold.')
  })
  it('formats acos_high critical', () => {
    expect(formatMessage('acos_high', 'critical', 'Kridlo', 45.0, 40, 7))
      .toBe('🚨 Kridlo ACOS is 45.0% (last 7d) — above 40% critical threshold.')
  })
  it('formats sales_drop warning', () => {
    expect(formatMessage('sales_drop', 'warning', 'Cadlec', 22.3, 20, 7))
      .toBe('⚠️ Cadlec sales dropped 22.3% vs prior 7d — above 20% warning threshold.')
  })
  it('formats sales_drop critical', () => {
    expect(formatMessage('sales_drop', 'critical', 'Cadlec', 40.0, 35, 7))
      .toBe('🚨 Cadlec sales dropped 40.0% vs prior 7d — above 35% critical threshold.')
  })
  it('formats roas_drop warning', () => {
    expect(formatMessage('roas_drop', 'warning', 'TinyLane', 1.80, 2.0, 14))
      .toBe('⚠️ TinyLane ROAS is 1.80 (last 14d) — below 2 warning threshold.')
  })
  it('formats roas_drop critical', () => {
    expect(formatMessage('roas_drop', 'critical', 'TinyLane', 1.20, 1.5, 14))
      .toBe('🚨 TinyLane ROAS is 1.20 (last 14d) — below 1.5 critical threshold.')
  })
})
