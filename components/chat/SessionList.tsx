'use client'

import { useEffect, useState } from 'react'
import { useChatContext } from './ChatContext'
import { BANDS, computeCostUsd, formatCost, Band } from '@/lib/chat/pricing'

const BAND_KEY = 'merchman_chat_band_usd'

interface Session {
  id: string
  title: string
  updated_at: string
  total_input_tokens: number
  total_output_tokens: number
}

export default function SessionList() {
  const { activeSessionId, setActiveSessionId } = useChatContext()
  const [sessions, setSessions] = useState<Session[]>([])
  const [monthlyCostUsd, setMonthlyCostUsd] = useState(0)
  const [band, setBand] = useState<Band>(BANDS[0])
  const [showBandPicker, setShowBandPicker] = useState(false)

  // Restore saved band
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BAND_KEY)
      if (saved) {
        const found = BANDS.find((b) => b.usd === Number(saved))
        if (found) setBand(found)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [sessRes, usageRes] = await Promise.all([
          fetch('/api/chat/sessions'),
          fetch('/api/chat/usage'),
        ])
        if (sessRes.ok) {
          const { sessions: data } = (await sessRes.json()) as { sessions: Session[] }
          setSessions(data)
        }
        if (usageRes.ok) {
          const { input_tokens, output_tokens } = (await usageRes.json()) as {
            input_tokens: number
            output_tokens: number
          }
          setMonthlyCostUsd(computeCostUsd(input_tokens, output_tokens))
        }
      } catch { /* ignore */ }
    }
    load()
  }, [activeSessionId])

  const pct = Math.min((monthlyCostUsd / band.usd) * 100, 100)
  const overLimit = monthlyCostUsd >= band.usd
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-accent-primary'

  const selectBand = (b: Band) => {
    setBand(b)
    setShowBandPicker(false)
    try { localStorage.setItem(BAND_KEY, String(b.usd)) } catch { /* ignore */ }
  }

  return (
    <div className="w-52 flex-shrink-0 border-r border-border-default flex flex-col bg-surface-raised h-full">
      <div className="p-3 border-b border-border-default">
        <button
          onClick={() => setActiveSessionId(null)}
          className="w-full text-sm bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg px-3 py-2 font-medium transition-colors"
        >
          + New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSessionId(s.id)}
            className={`w-full text-left px-3 py-2 text-xs rounded-lg mx-1 mb-0.5 transition-colors truncate ${
              activeSessionId === s.id
                ? 'bg-accent-primary/10 text-accent-primary font-medium'
                : 'text-text-secondary hover:bg-surface-raised'
            }`}
          >
            {s.title}
          </button>
        ))}
        {sessions.length === 0 && (
          <p className="text-xs text-text-muted px-3 py-4">No chats yet</p>
        )}
      </div>

      {/* Usage meter */}
      <div className="p-3 border-t border-border-default space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted font-medium">This month</p>
          {/* Band picker toggle */}
          <button
            onClick={() => setShowBandPicker((v) => !v)}
            className="text-xs text-text-muted hover:text-accent-primary transition-colors"
            title="Change plan limit"
          >
            {band.label} ▾
          </button>
        </div>

        {/* Band picker dropdown */}
        {showBandPicker && (
          <div className="bg-surface-card border border-border-default rounded-lg shadow-sm overflow-hidden">
            {BANDS.map((b) => (
              <button
                key={b.usd}
                onClick={() => selectBand(b)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  b.usd === band.usd
                    ? 'bg-accent-primary/10 text-accent-primary font-medium'
                    : 'text-text-secondary hover:bg-surface-raised'
                }`}
              >
                {b.label} — ${b.usd}/mo
              </button>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className={overLimit ? 'text-red-600 font-medium' : 'text-text-secondary'}>
              {formatCost(monthlyCostUsd)}
            </span>
            <span className="text-text-muted">${band.usd}</span>
          </div>
          <div className="h-1.5 bg-border-default rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {overLimit && (
            <p className="text-xs text-red-500">Limit reached — upgrade plan</p>
          )}
        </div>
      </div>
    </div>
  )
}
