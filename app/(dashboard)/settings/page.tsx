'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Brand { id: string; name: string; created_at: string }

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E2761]">Brands</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your brands and Amazon connections</p>
      </div>

      {/* Create brand */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Add a brand</h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Cadlec, Kridlo, TinyLane"
            required
            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#0D9488] text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Add brand'}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {success && <p className="text-sm text-teal-600 mt-2">{success}</p>}
      </div>

      {/* Brand list */}
      {brands.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Your brands</h2>
          <div className="space-y-2">
            {brands.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{b.name}</p>
                  <p className="text-xs text-slate-400">Amazon India</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/brands/${b.id}/upload`)}
                    className="text-xs bg-teal-50 text-teal-700 font-medium px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors"
                  >
                    Upload data
                  </button>
                  <button
                    onClick={() => router.push(`/brands/${b.id}/settings`)}
                    className="text-xs bg-slate-50 text-slate-600 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Amazon settings
                  </button>
                  <button
                    onClick={() => router.push(`/brands/${b.id}`)}
                    className="text-xs bg-[#1E2761] text-white font-medium px-3 py-1.5 rounded-lg hover:bg-[#16205a] transition-colors"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
