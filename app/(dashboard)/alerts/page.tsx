import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge, BadgeColor } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'

interface AlertRow {
  id: string
  type: string
  severity: string
  message: string
  metric_value: number | null
  threshold: number | null
  resolved_at: string | null
  created_at: string
  brands: { id: string; name: string }
}

function severityColor(severity: string): BadgeColor {
  if (severity === 'critical') return 'red'
  if (severity === 'warning') return 'amber'
  return 'blue'
}

export default async function AlertsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('alerts')
    .select('*, brands!inner(id, name)')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = (data ?? []) as AlertRow[]
  const unresolved = rows.filter(a => !a.resolved_at)
  const resolved = rows.filter(a => a.resolved_at)

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader title="Alerts" />

      <p className="text-sm text-text-secondary -mt-4 mb-6">
        {unresolved.length} active · {resolved.length} resolved
      </p>

      {rows.length === 0 && (
        <EmptyState
          icon="🔔"
          title="No alerts"
          description="All clear — no active alerts."
        />
      )}

      {unresolved.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">Active</h2>
          <div className="bg-surface-card border border-border-default rounded-2xl divide-y divide-border-subtle">
            {unresolved.map(a => <AlertItem key={a.id} alert={a} severityColor={severityColor} />)}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">Resolved</h2>
          <div className="bg-surface-card border border-border-default rounded-2xl divide-y divide-border-subtle opacity-60">
            {resolved.map(a => <AlertItem key={a.id} alert={a} severityColor={severityColor} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function AlertItem({ alert, severityColor }: { alert: AlertRow; severityColor: (s: string) => BadgeColor }) {
  const createdAt = new Date(alert.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className="mt-0.5 text-base flex-shrink-0">
        {alert.severity === 'critical' ? '🚨' : '⚠️'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary leading-snug">{alert.message}</p>
        <p className="text-xs text-text-muted mt-0.5">{alert.brands?.name} · {createdAt}</p>
      </div>
      {alert.resolved_at
        ? <StatusBadge label="resolved" color="slate" size="md" />
        : <StatusBadge label={alert.severity} color={severityColor(alert.severity)} size="md" />
      }
    </div>
  )
}
