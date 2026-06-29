'use client'

import { useState, useEffect } from 'react'

export interface ChartColors {
  positive: string
  negative: string
  amber: string
  blue: string
  teal: string
  navy: string
  muted: string
  grid: string
}

const DEFAULTS: ChartColors = {
  positive: '#10B981',
  negative: '#EF4444',
  amber: '#F59E0B',
  blue: '#3B82F6',
  teal: '#0D9488',
  navy: '#1E2761',
  muted: '#64748B',
  grid: '#E2E8F0',
}

function readVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(DEFAULTS)

  useEffect(() => {
    function sync() {
      setColors({
        positive: readVar('--data-positive') || DEFAULTS.positive,
        negative: readVar('--data-negative') || DEFAULTS.negative,
        amber: readVar('--data-amber') || DEFAULTS.amber,
        blue: readVar('--data-blue') || DEFAULTS.blue,
        teal: readVar('--accent-primary') || DEFAULTS.teal,
        navy: '#1E2761',
        muted: readVar('--text-muted') || DEFAULTS.muted,
        grid: readVar('--border-default') || DEFAULTS.grid,
      })
    }

    sync()

    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return colors
}
