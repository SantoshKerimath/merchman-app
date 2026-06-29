'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface AlertRow {
  id: string
  type: string
  severity: string
  message: string
  brands: { id: string; name: string }
}

export default function AlertToast() {
  const router = useRouter()
  const [queue, setQueue] = useState<AlertRow[]>([])

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts?unresolved=true')
      if (!res.ok) return
      const { alerts } = await res.json()
      // critical first
      const sorted = (alerts as AlertRow[]).sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1
        if (b.severity === 'critical' && a.severity !== 'critical') return 1
        return 0
      })
      setQueue(sorted)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60_000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  async function dismiss(id: string) {
    await fetch(`/api/alerts/${id}`, { method: 'PATCH' })
    setQueue(q => q.filter(a => a.id !== id))
  }

  async function act(alert: AlertRow) {
    await dismiss(alert.id)
    router.push(`/brands/${alert.brands?.id}`)
  }

  const visible = queue.slice(0, 3)
  if (visible.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-80">
      {visible.map((alert, i) => (
        <div
          key={alert.id}
          className={`rounded-xl border shadow-lg p-4 text-sm transition-all ${
            alert.severity === 'critical'
              ? 'bg-data-negative/5 border-data-negative/20'
              : 'bg-data-amber/5 border-data-amber/20'
          }`}
          style={{ opacity: 1 - i * 0.12 }}
        >
          <p className={`font-medium mb-2 leading-snug ${
            alert.severity === 'critical' ? 'text-data-negative' : 'text-data-amber'
          }`}>
            {alert.message}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => dismiss(alert.id)}
              className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-surface-card border border-border-default text-text-secondary hover:bg-surface-raised transition-colors"
            >
              Ignore
            </button>
            <button
              onClick={() => act(alert)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg text-text-on-brand transition-colors ${
                alert.severity === 'critical'
                  ? 'bg-data-negative hover:opacity-90'
                  : 'bg-data-amber hover:opacity-90'
              }`}
            >
              Act →
            </button>
          </div>
        </div>
      ))}
      {queue.length > 3 && (
        <p className="text-xs text-center text-text-muted">+{queue.length - 3} more alerts</p>
      )}
    </div>
  )
}
