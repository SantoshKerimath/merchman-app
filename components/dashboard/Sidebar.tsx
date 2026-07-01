'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Zap, Tag, Bell, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Command Center', Icon: Zap },
  { href: '/settings', label: 'Brands', Icon: Tag },
  { href: '/alerts', label: 'Alerts', Icon: Bell },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userInitial, setUserInitial] = useState('?')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? null
      setUserEmail(email)
      if (email) setUserInitial(email[0].toUpperCase())
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/alerts?unresolved=true')
        if (!res.ok) return
        const { alerts } = await res.json()
        setUnresolvedCount((alerts as unknown[]).length)
      } catch { /* ignore */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="w-56 flex-shrink-0 bg-surface-sidebar flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <h1 className="text-xl font-extrabold text-white">
          Merch<span className="text-accent-primary">Man</span>
        </h1>
        <p className="text-xs text-white/40 mt-0.5">Amazon Analytics</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.Icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={16} />
              <span className="flex-1">{item.label}</span>
              {item.href === '/alerts' && unresolvedCount > 0 && (
                <span className="bg-data-negative text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-tight">
                  {unresolvedCount > 99 ? '99+' : unresolvedCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + Footer */}
      <div className="border-t border-white/10">
        {/* Profile row */}
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{userEmail ?? '—'}</p>
            <p className="text-[10px] text-white/40">Merchant</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
        {/* Version + theme */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <p className="text-xs text-white/30">MerchMan v0.1</p>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
