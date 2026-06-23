import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E2761]">Alerts</h1>
        <p className="text-sm text-slate-500 mt-1">
          {unresolved.length} active · {resolved.length} resolved
        </p>
      </div>

      {rows.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          No alerts yet. They fire after each sync when thresholds are breached.
        </div>
      )}

      {unresolved.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Active</h2>
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            {unresolved.map(a => <AlertRow key={a.id} alert={a} />)}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Resolved</h2>
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 opacity-60">
            {resolved.map(a => <AlertRow key={a.id} alert={a} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function AlertRow({ alert }: { alert: AlertRow }) {
  const createdAt = new Date(alert.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className="mt-0.5 text-base flex-shrink-0">
        {alert.severity === 'critical' ? '🚨' : '⚠️'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 leading-snug">{alert.message}</p>
        <p className="text-xs text-slate-400 mt-0.5">{alert.brands?.name} · {createdAt}</p>
      </div>
      <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
        alert.resolved_at
          ? 'bg-slate-100 text-slate-400'
          : alert.severity === 'critical'
            ? 'bg-red-100 text-red-700'
            : 'bg-amber-100 text-amber-700'
      }`}>
        {alert.resolved_at ? 'resolved' : alert.severity}
      </span>
    </div>
  )
}
