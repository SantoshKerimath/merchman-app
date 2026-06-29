'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'

interface Brand { id: string; name: string; created_at: string; is_pinned: boolean; is_connected: boolean }

export default function SettingsPage() {
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadBrands = useCallback(async () => {
    const res = await fetch('/api/brands')
    const data = await res.json()
    setBrands(data.brands ?? [])
  }, [])

  useEffect(() => { loadBrands() }, [loadBrands])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
    } else {
      setSuccess(`Brand "${data.brand.name}" created!`)
      setName('')
      loadBrands()
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Brands" />
      <p className="text-sm text-text-secondary -mt-4 mb-6">Manage your brands and Amazon connections</p>

      {/* Create brand */}
      <SectionCard title="Add a brand" padding="lg" className="mb-6">
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Cadlec, Kridlo, TinyLane"
            required
            className="flex-1 px-3 py-2.5 border border-border-default bg-surface-card text-text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-accent-primary text-text-on-brand text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-accent-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Add brand'}
          </button>
        </form>
        {error && <p className="text-sm text-data-negative mt-2">{error}</p>}
        {success && <p className="text-sm text-data-positive mt-2">{success}</p>}
      </SectionCard>

      {/* Brand list */}
      {brands.length > 0 && (
        <SectionCard title="Your brands" padding="lg">
          <div className="space-y-2">
            {brands.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-border-subtle last:border-0">
                <div>
                  <p className="text-sm font-medium text-text-primary">{b.name}</p>
                  <p className="text-xs text-text-muted">Amazon India</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/brands/${b.id}/upload`)}
                    className="text-xs bg-accent-primary-subtle text-accent-primary font-medium px-3 py-1.5 rounded-lg hover:bg-accent-primary-subtle transition-colors"
                  >
                    Upload data
                  </button>
                  <button
                    onClick={() => router.push(`/brands/${b.id}/settings`)}
                    className="text-xs bg-surface-raised text-text-secondary font-medium px-3 py-1.5 rounded-lg hover:bg-surface-raised transition-colors"
                  >
                    Amazon settings
                  </button>
                  <button
                    onClick={() => b.is_connected && router.push(`/brands/${b.id}/alerts`)}
                    disabled={!b.is_connected}
                    title={!b.is_connected ? 'Connect Amazon first' : undefined}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      b.is_connected
                        ? 'bg-data-amber/10 text-data-amber hover:bg-data-amber/20 cursor-pointer'
                        : 'bg-surface-raised text-text-muted cursor-not-allowed'
                    }`}
                  >
                    Alert config
                  </button>
                  <button
                    onClick={() => router.push(`/brands/${b.id}`)}
                    className="text-xs bg-surface-sidebar text-text-on-brand font-medium px-3 py-1.5 rounded-lg hover:opacity-90 transition-colors"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
