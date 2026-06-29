// app/components/settings/ScheduleConfig.tsx
'use client'
import { useState } from 'react'

interface SyncSchedule {
  type: 'manual' | 'daily' | 'weekly' | 'custom' | 'on_login'
  days: number[]
  time: string
  on_login: boolean
}

interface Props {
  brandId: string
  initialSchedule: SyncSchedule
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SCHEDULE_OPTIONS: { value: SyncSchedule['type']; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom days' },
  { value: 'on_login', label: 'On login' },
]

export default function ScheduleConfig({ brandId, initialSchedule }: Props) {
  // Normalise legacy schedule that stored on_login as a separate boolean
  const normalised: SyncSchedule = initialSchedule.on_login && initialSchedule.type !== 'on_login'
    ? { ...initialSchedule, type: 'on_login', on_login: true }
    : { ...initialSchedule, on_login: initialSchedule.type === 'on_login' }

  const [schedule, setSchedule] = useState<SyncSchedule>(normalised)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(updated: SyncSchedule) {
    setSchedule(updated)
    setSaving(true)
    setSaved(false)
    await fetch(`/api/brands/${brandId}/credentials`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync_schedule: updated }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function setType(type: SyncSchedule['type']) {
    const days = type === 'weekly' && schedule.days.length === 0 ? [1] : schedule.days
    save({ ...schedule, type, days, on_login: type === 'on_login' })
  }

  function setWeekDay(day: number) {
    save({ ...schedule, days: [day] })
  }

  function toggleCustomDay(day: number) {
    const days = schedule.days.includes(day)
      ? schedule.days.filter(d => d !== day)
      : [...schedule.days, day].sort((a, b) => a - b)
    save({ ...schedule, days })
  }

  const showTimePicker = schedule.type !== 'manual' && schedule.type !== 'on_login'
  const weekDay = schedule.days[0] ?? 1

  return (
    <div className="space-y-4">
      {/* Schedule type — mutually exclusive radio pills */}
      <div className="flex flex-wrap gap-2">
        {SCHEDULE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setType(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              schedule.type === opt.value
                ? 'bg-accent-primary text-text-on-brand border-accent-primary'
                : 'bg-surface-card text-text-muted border-border-default hover:border-accent-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Weekly — single day of week */}
      {schedule.type === 'weekly' && (
        <div>
          <p className="text-xs text-text-muted mb-2">Which day?</p>
          <div className="flex gap-2 flex-wrap">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setWeekDay(i)}
                className={`w-10 h-10 rounded-full text-xs font-semibold border transition-colors ${
                  weekDay === i
                    ? 'bg-accent-primary text-text-on-brand border-accent-primary'
                    : 'bg-surface-card text-text-muted border-border-default hover:border-accent-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom — multi-select days */}
      {schedule.type === 'custom' && (
        <div>
          <p className="text-xs text-text-muted mb-2">Which days?</p>
          <div className="flex gap-2 flex-wrap">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => toggleCustomDay(i)}
                className={`w-10 h-10 rounded-full text-xs font-semibold border transition-colors ${
                  schedule.days.includes(i)
                    ? 'bg-accent-primary text-text-on-brand border-accent-primary'
                    : 'bg-surface-card text-text-muted border-border-default hover:border-accent-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* On login hint */}
      {schedule.type === 'on_login' && (
        <p className="text-xs text-text-muted">
          Data syncs automatically each time you open MerchMan.
        </p>
      )}

      {/* Time picker — daily / weekly / custom only */}
      {showTimePicker && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-text-secondary w-16">Time</label>
          <input
            type="time"
            value={schedule.time}
            onChange={e => save({ ...schedule, time: e.target.value })}
            className="border border-border-default bg-surface-card text-text-primary rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
      )}

      {(saving || saved) && (
        <p className="text-xs text-data-positive">{saving ? 'Saving…' : '✓ Saved'}</p>
      )}
    </div>
  )
}
