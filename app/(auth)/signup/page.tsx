'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, agency_name: agencyName },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-surface-sidebar">
            Merch<span className="text-accent-primary">Man</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">Amazon analytics for brand agencies</p>
        </div>

        <div className="bg-surface-card rounded-2xl shadow-sm border border-border-default p-8">
          <h2 className="text-xl font-bold text-text-primary mb-6">Create your account</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Agency name</label>
              <input
                type="text"
                value={agencyName}
                onChange={e => setAgencyName(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-border-default bg-surface-card text-text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent placeholder-text-muted"
                placeholder="Growz Scalers"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Your name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-border-default bg-surface-card text-text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent placeholder-text-muted"
                placeholder="Santosh Kerimath"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-border-default bg-surface-card text-text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent placeholder-text-muted"
                placeholder="you@agency.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2.5 border border-border-default bg-surface-card text-text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent placeholder-text-muted"
                placeholder="Min 8 characters"
              />
            </div>

            {error && (
              <p className="text-sm text-data-negative bg-data-negative/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-accent-primary hover:text-accent-primary-hover font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
