'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setResetSent(true)
  }

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-surface-sidebar">
            Merch<span className="text-accent-primary">Man</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">Amazon analytics for brand agencies</p>
        </div>

        {/* Card */}
        <div className="bg-surface-card rounded-2xl shadow-sm border border-border-default p-8">
          {mode === 'login' ? (
            <>
              <h2 className="text-xl font-bold text-text-primary mb-6">Sign in to your account</h2>
              <form onSubmit={handleLogin} className="space-y-4">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-text-secondary">Password</label>
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(null) }}
                      className="text-xs text-accent-primary hover:text-accent-primary-hover"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-border-default bg-surface-card text-text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent placeholder-text-muted"
                    placeholder="••••••••"
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
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
              <p className="text-center text-sm text-text-secondary mt-6">
                Don&apos;t have an account?{' '}
                <a href="/signup" className="text-accent-primary hover:text-accent-primary-hover font-medium">
                  Sign up
                </a>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-text-primary mb-2">Reset your password</h2>
              <p className="text-sm text-text-secondary mb-6">
                Enter your email and we&apos;ll send a reset link.
              </p>
              {resetSent ? (
                <div className="text-sm text-data-positive bg-data-positive/10 px-4 py-3 rounded-lg text-center">
                  ✓ Check your email for the reset link.
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
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
                  {error && (
                    <p className="text-sm text-data-negative bg-data-negative/10 px-3 py-2 rounded-lg">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
              )}
              <button
                onClick={() => { setMode('login'); setError(null); setResetSent(false) }}
                className="mt-4 text-sm text-text-secondary hover:text-text-primary w-full text-center"
              >
                ← Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
