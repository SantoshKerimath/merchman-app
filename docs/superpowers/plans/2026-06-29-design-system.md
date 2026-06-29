# MerchMan Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 40+ files of hardcoded hex colors with a two-layer CSS token system, build 6 shared primitive components, and add persistent light/dark mode with Bloomberg Terminal dark palette.

**Architecture:** CSS custom properties in `globals.css` form the token foundation; semantic tokens remap shadcn variables so future shadcn component adoption requires zero token changes; 6 React primitives in `components/ui/` consume tokens only; pages migrated in priority order with `tsc --noEmit` passing after every task.

**Tech Stack:** Next.js 16 App Router, Tailwind v4 (`@theme inline`), shadcn/ui, Lucide React (already installed via shadcn)

## Global Constraints

- Next.js 16 App Router — no `"use client"` unless component uses state/events
- Tailwind v4 — register tokens via `@theme inline` block in `globals.css` only
- shadcn/ui installed — tokens must remap shadcn semantic variables (`--background`, `--card`, `--primary`, etc.)
- Zero hardcoded hex (`#1E2761`, `#0D9488`, `#16205a`, etc.) in component files after migration
- All 6 primitives must accept `className?: string` prop
- `npx tsc --noEmit` must pass after every task — do not proceed if it fails
- No new npm packages — Lucide React already installed
- All paths relative to `app/` (the git root) — e.g., `globals.css` means `app/globals.css`

---

### Task 1: CSS Token Foundation

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces CSS custom properties: `--surface-page`, `--surface-card`, `--surface-raised`, `--surface-sidebar`, `--text-primary`, `--text-secondary`, `--text-muted`, `--text-on-brand`, `--border-default`, `--border-subtle`, `--accent-primary`, `--accent-primary-hover`, `--accent-primary-subtle`, `--data-positive`, `--data-negative`, `--data-amber`, `--data-blue`
- Produces Tailwind utilities: `bg-surface-card`, `text-text-primary`, `border-border-default`, `bg-accent-primary`, `text-data-positive`, etc.

- [ ] **Step 1: Replace `app/globals.css` with the following complete file**

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* ── Layer 1: Primitive tokens (raw values — never reference directly in JSX) ── */
:root {
  --brand-navy: #1E2761;
  --brand-navy-dark: #0D1117;
  --brand-teal: #0D9488;
  --brand-teal-bright: #14B8A6;
}

/* ── Layer 2: Semantic tokens — Light mode ── */
:root {
  --surface-page: #F0F2F7;
  --surface-card: #FFFFFF;
  --surface-raised: #F8FAFC;
  --surface-sidebar: #1E2761;
  --text-primary: #0D1117;
  --text-secondary: #374151;
  --text-muted: #64748B;
  --text-on-brand: #FFFFFF;
  --border-default: #E2E8F0;
  --border-subtle: #F1F5F9;
  --accent-primary: #0D9488;
  --accent-primary-hover: #0F766E;
  --accent-primary-subtle: #F0FDFA;
  --data-positive: #10B981;
  --data-negative: #EF4444;
  --data-amber: #F59E0B;
  --data-blue: #3B82F6;
}

/* ── Layer 2: Semantic tokens — Dark mode ── */
.dark {
  --surface-page: #0A0E1A;
  --surface-card: #111827;
  --surface-raised: #1A2236;
  --surface-sidebar: #0D1117;
  --text-primary: #E2E8F0;
  --text-secondary: #94A3B8;
  --text-muted: #4B5563;
  --text-on-brand: #FFFFFF;
  --border-default: #1E2D45;
  --border-subtle: #111827;
  --accent-primary: #14B8A6;
  --accent-primary-hover: #0D9488;
  --accent-primary-subtle: #042F2E;
  --data-positive: #10B981;
  --data-negative: #EF4444;
  --data-amber: #F59E0B;
  --data-blue: #60A5FA;
}

/* ── Remap shadcn semantic variables to our tokens ── */
:root {
  --background: var(--surface-page);
  --foreground: var(--text-primary);
  --card: var(--surface-card);
  --card-foreground: var(--text-primary);
  --popover: var(--surface-card);
  --popover-foreground: var(--text-primary);
  --primary: var(--accent-primary);
  --primary-foreground: var(--text-on-brand);
  --secondary: var(--surface-raised);
  --secondary-foreground: var(--text-primary);
  --muted: var(--surface-raised);
  --muted-foreground: var(--text-muted);
  --accent: var(--accent-primary-subtle);
  --accent-foreground: var(--accent-primary);
  --destructive: var(--data-negative);
  --border: var(--border-default);
  --input: var(--border-default);
  --ring: var(--accent-primary);
  --radius: 0.625rem;
  --sidebar: var(--surface-sidebar);
  --sidebar-foreground: var(--text-on-brand);
  --sidebar-primary: var(--accent-primary);
  --sidebar-primary-foreground: var(--text-on-brand);
  --sidebar-accent: rgba(255,255,255,0.1);
  --sidebar-accent-foreground: var(--text-on-brand);
  --sidebar-border: rgba(255,255,255,0.1);
  --sidebar-ring: var(--accent-primary);
}

/* ── Register semantic tokens as Tailwind utilities ── */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface-page: var(--surface-page);
  --color-surface-card: var(--surface-card);
  --color-surface-raised: var(--surface-raised);
  --color-surface-sidebar: var(--surface-sidebar);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-text-on-brand: var(--text-on-brand);
  --color-border-default: var(--border-default);
  --color-border-subtle: var(--border-subtle);
  --color-accent-primary: var(--accent-primary);
  --color-accent-primary-hover: var(--accent-primary-hover);
  --color-accent-primary-subtle: var(--accent-primary-subtle);
  --color-data-positive: var(--data-positive);
  --color-data-negative: var(--data-negative);
  --color-data-amber: var(--data-amber);
  --color-data-blue: var(--data-blue);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: Verify TypeScript passes**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Visual smoke check**

```bash
cd app && npm run dev
```

Navigate to `http://localhost:3000`. App renders (page background shifts to `#F0F2F7` — correct). No broken layout.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): CSS token foundation — semantic tokens + shadcn remap + Tailwind utilities"
```

---

### Task 2: Dark Mode Infrastructure

**Files:**
- Create: `app/components/ThemeProvider.tsx`
- Create: `app/components/ThemeToggle.tsx`
- Modify: `app/app/layout.tsx`

**Interfaces:**
- Produces:
  - `ThemeProvider({ children: React.ReactNode }): JSX.Element` — wraps layout body
  - `ThemeToggle(): JSX.Element` — sun/moon button, used in Sidebar (Task 5)
  - Anti-flash inline `<script>` in layout that sets `.dark` on `<html>` before hydration

- [ ] **Step 1: Create `app/components/ThemeProvider.tsx`**

```tsx
'use client'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Class is set by the inline script in layout.tsx before React hydrates.
  // This component is a mount point for future server-side preference persistence.
  return <>{children}</>
}
```

- [ ] **Step 2: Create `app/components/ThemeToggle.tsx`**

```tsx
'use client'

import { Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('mm_theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
```

- [ ] **Step 3: Read current `app/app/layout.tsx`**

Run: `cat app/app/layout.tsx`

You need to see its current structure before editing.

- [ ] **Step 4: Modify `app/app/layout.tsx`**

Add `import { ThemeProvider } from '@/components/ThemeProvider'` to imports.

Add `suppressHydrationWarning` to `<html>` tag (prevents React mismatch warning when inline script sets `.dark` class before hydration).

Add the anti-flash inline script inside `<html>` before `<body>`:

```tsx
import { ThemeProvider } from '@/components/ThemeProvider'

// In the JSX, the <html> and <body> should look like:
<html lang="en" suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{
      __html: `(function(){var t=localStorage.getItem('mm_theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})();`
    }} />
  </head>
  <body className={/* keep existing className */}>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </body>
</html>
```

Keep all existing imports, fonts, and metadata — only add the script and wrap children with ThemeProvider.

- [ ] **Step 5: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Test dark mode manually**

```bash
npm run dev
```

Open browser DevTools console, run:
```js
document.documentElement.classList.add('dark')
```

Page background → `#0A0E1A`. Run:
```js
document.documentElement.classList.remove('dark')
```

Page background → `#F0F2F7`. ThemeToggle not wired to sidebar yet — that's Task 5.

Also test persistence: add `.dark`, hard-refresh (`Cmd+Shift+R`) — page should load dark without flash.

- [ ] **Step 7: Commit**

```bash
git add app/components/ThemeProvider.tsx app/components/ThemeToggle.tsx app/app/layout.tsx
git commit -m "feat(design): dark mode infrastructure — ThemeProvider, ThemeToggle, anti-flash script"
```

---

### Task 3: KpiCard + StatusBadge Primitives

**Files:**
- Create: `app/components/ui/KpiCard.tsx`
- Create: `app/components/ui/StatusBadge.tsx`

**Interfaces:**
- Produces:
  ```tsx
  // KpiCard
  export interface KpiCardProps {
    label: string
    value: string
    sub?: string
    trend?: number        // positive = ↑ green, negative = ↓ red, 0 = — muted
    variant?: 'default' | 'positive' | 'negative' | 'warning'
    className?: string
  }
  export function KpiCard(props: KpiCardProps): JSX.Element

  // StatusBadge
  export type BadgeColor = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'teal'
  export interface StatusBadgeProps {
    label: string
    color: BadgeColor
    size?: 'sm' | 'md'
    className?: string
  }
  export function StatusBadge(props: StatusBadgeProps): JSX.Element
  ```

- [ ] **Step 1: Create `app/components/ui/KpiCard.tsx`**

```tsx
import { cn } from '@/lib/utils'

export interface KpiCardProps {
  label: string
  value: string
  sub?: string
  trend?: number
  variant?: 'default' | 'positive' | 'negative' | 'warning'
  className?: string
}

const variantValueClass: Record<NonNullable<KpiCardProps['variant']>, string> = {
  default: 'text-text-primary',
  positive: 'text-data-positive',
  negative: 'text-data-negative',
  warning: 'text-data-amber',
}

export function KpiCard({ label, value, sub, trend, variant = 'default', className }: KpiCardProps) {
  const trendUp = trend !== undefined && trend > 0
  const trendDown = trend !== undefined && trend < 0

  return (
    <div className={cn(
      'bg-surface-card border border-border-default rounded-xl p-4',
      className
    )}>
      <p className="text-xs font-medium text-text-muted mb-1">{label}</p>
      <p className={cn(
        'text-lg font-bold tabular-nums',
        variantValueClass[variant]
      )}>
        {value}
      </p>
      <div className="flex items-center gap-2 mt-0.5 min-h-[16px]">
        {sub && <p className="text-xs text-text-muted">{sub}</p>}
        {trend !== undefined && (
          <span className={cn(
            'text-xs font-medium',
            trendUp && 'text-data-positive',
            trendDown && 'text-data-negative',
            !trendUp && !trendDown && 'text-text-muted'
          )}>
            {trendUp ? '↑' : trendDown ? '↓' : '–'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `app/components/ui/StatusBadge.tsx`**

```tsx
import { cn } from '@/lib/utils'

export type BadgeColor = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'teal'

export interface StatusBadgeProps {
  label: string
  color: BadgeColor
  size?: 'sm' | 'md'
  className?: string
}

const colorClasses: Record<BadgeColor, string> = {
  green: 'bg-data-positive/10 text-data-positive',
  red: 'bg-data-negative/10 text-data-negative',
  amber: 'bg-data-amber/10 text-data-amber',
  blue: 'bg-data-blue/10 text-data-blue',
  slate: 'bg-surface-raised text-text-muted',
  teal: 'bg-accent-primary-subtle text-accent-primary',
}

const sizeClasses: Record<NonNullable<StatusBadgeProps['size']>, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
}

export function StatusBadge({ label, color, size = 'sm', className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      colorClasses[color],
      sizeClasses[size],
      className
    )}>
      {label}
    </span>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/ui/KpiCard.tsx app/components/ui/StatusBadge.tsx
git commit -m "feat(design): KpiCard + StatusBadge primitives"
```

---

### Task 4: PageHeader + SectionCard + EmptyState + DataTable Primitives

**Files:**
- Create: `app/components/ui/PageHeader.tsx`
- Create: `app/components/ui/SectionCard.tsx`
- Create: `app/components/ui/EmptyState.tsx`
- Create: `app/components/ui/DataTable.tsx`

**Interfaces:**
- Produces:
  ```tsx
  // PageHeader
  export interface PageHeaderProps {
    title: string
    breadcrumb?: { label: string; href: string }[]
    actions?: React.ReactNode
    className?: string
  }
  export function PageHeader(props: PageHeaderProps): JSX.Element

  // SectionCard
  export interface SectionCardProps {
    title?: string
    action?: React.ReactNode
    padding?: 'sm' | 'md' | 'lg'
    children: React.ReactNode
    className?: string
  }
  export function SectionCard(props: SectionCardProps): JSX.Element

  // EmptyState
  export interface EmptyStateAction { label: string; href?: string; onClick?: () => void }
  export interface EmptyStateProps {
    icon?: string
    title: string
    description?: string
    action?: EmptyStateAction
    className?: string
  }
  export function EmptyState(props: EmptyStateProps): JSX.Element

  // DataTable
  export interface DataTableHeader { label: string; align?: 'left' | 'right' | 'center' }
  export interface DataTableProps {
    headers: DataTableHeader[]
    children: React.ReactNode
    className?: string
  }
  export function DataTable(props: DataTableProps): JSX.Element
  ```

- [ ] **Step 1: Create `app/components/ui/PageHeader.tsx`**

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  breadcrumb?: { label: string; href: string }[]
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, breadcrumb, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <p className="text-sm text-text-muted mb-0.5">
            {breadcrumb.map((item, i) => (
              <span key={item.href}>
                {i > 0 && <span className="mx-1 text-text-muted">›</span>}
                <Link href={item.href} className="hover:text-text-secondary transition-colors">
                  {item.label}
                </Link>
              </span>
            ))}
            <span className="mx-1 text-text-muted">›</span>
            <span className="text-text-secondary">{title}</span>
          </p>
        )}
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/components/ui/SectionCard.tsx`**

```tsx
import { cn } from '@/lib/utils'

const paddingClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const

export interface SectionCardProps {
  title?: string
  action?: React.ReactNode
  padding?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

export function SectionCard({ title, action, padding = 'md', children, className }: SectionCardProps) {
  return (
    <div className={cn(
      'bg-surface-card border border-border-default rounded-xl',
      className
    )}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          {title && <p className="text-sm font-semibold text-text-primary">{title}</p>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  )
}
```

- [ ] **Step 3: Create `app/components/ui/EmptyState.tsx`**

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
}

export interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && <div className="text-3xl mb-3">{icon}</div>}
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description && (
        <p className="text-xs text-text-muted mt-1 max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-block bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `app/components/ui/DataTable.tsx`**

```tsx
import { cn } from '@/lib/utils'

export interface DataTableHeader {
  label: string
  align?: 'left' | 'right' | 'center'
}

export interface DataTableProps {
  headers: DataTableHeader[]
  children: React.ReactNode
  className?: string
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

export function DataTable({ headers, children, className }: DataTableProps) {
  return (
    <div className={cn(
      'bg-surface-card border border-border-default rounded-xl overflow-hidden',
      className
    )}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default bg-surface-raised">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-4 py-2.5 text-xs text-text-muted font-medium',
                    alignClass[h.align ?? 'left']
                  )}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/components/ui/PageHeader.tsx app/components/ui/SectionCard.tsx app/components/ui/EmptyState.tsx app/components/ui/DataTable.tsx
git commit -m "feat(design): PageHeader + SectionCard + EmptyState + DataTable primitives"
```

---

### Task 5: Sidebar Refresh + ThemeToggle

**Files:**
- Modify: `app/components/dashboard/Sidebar.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` from `@/components/ThemeToggle` (Task 2)
- Produces: Updated sidebar with Lucide icons (`Zap`, `Tag`, `Bell`), ThemeToggle in footer, `bg-surface-sidebar` token

- [ ] **Step 1: Read `app/components/dashboard/Sidebar.tsx`**

Check the current nav items and their hrefs before rewriting — you need to preserve correct routes.

- [ ] **Step 2: Rewrite `app/components/dashboard/Sidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Zap, Tag, Bell } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

const navItems = [
  { href: '/dashboard', label: 'Command Center', icon: Zap },
  { href: '/settings', label: 'Brands', icon: Tag },
  { href: '/alerts', label: 'Alerts', icon: Bell },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [unresolvedCount, setUnresolvedCount] = useState(0)

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch('/api/alerts?unresolved=true')
        if (!res.ok) return
        const data = await res.json()
        setUnresolvedCount((data.alerts as unknown[]).length)
      } catch {
        // ignore — sidebar badge is non-critical
      }
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
          const Icon = item.icon
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

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10 flex items-center justify-between">
        <p className="text-xs text-white/30">MerchMan v0.1</p>
        <ThemeToggle />
      </div>
    </aside>
  )
}
```

Note: If the current Sidebar.tsx has additional nav items or different hrefs, preserve them — just replace emoji icons with appropriate Lucide icons and add ThemeToggle to the footer.

- [ ] **Step 3: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Visual check**

```bash
npm run dev
```

- Sidebar shows Lucide icons (not emoji)
- ThemeToggle button in footer — clicking toggles dark/light
- Dark mode: sidebar stays dark (correct — `--surface-sidebar` dark value is `#0D1117`)
- Light mode: sidebar stays navy (correct — `--surface-sidebar` light value is `#1E2761`)
- Theme persists on hard refresh

- [ ] **Step 5: Commit**

```bash
git add app/components/dashboard/Sidebar.tsx
git commit -m "feat(design): sidebar — Lucide icons + ThemeToggle + bg-surface-sidebar token"
```

---

### Task 6: useChartColors Hook + Chart Migration

**Files:**
- Create: `app/lib/hooks/use-chart-colors.ts`
- Modify: `app/components/charts/DailySalesChart.tsx`
- Modify: `app/components/charts/OrganicVsPPCChart.tsx`
- Modify: `app/components/charts/ACOSTrendChart.tsx`
- Modify: `app/components/charts/SpendVsSalesChart.tsx`
- Modify: `app/components/charts/SessionsConversionChart.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface ChartColors {
    positive: string  // --data-positive
    negative: string  // --data-negative
    amber: string     // --data-amber
    blue: string      // --data-blue
    teal: string      // --accent-primary
    navy: string      // always #1E2761 (sidebar constant)
    muted: string     // --text-muted
    grid: string      // --border-default
  }
  export function useChartColors(): ChartColors
  ```

- [ ] **Step 1: Create directory if needed**

```bash
mkdir -p app/lib/hooks
```

- [ ] **Step 2: Create `app/lib/hooks/use-chart-colors.ts`**

```ts
'use client'

import { useState, useEffect } from 'react'

export interface ChartColors {
  positive: string
  negative: string
  amber: string
  blue: string
  teal: string
  navy: string
  muted: string
  grid: string
}

const DEFAULTS: ChartColors = {
  positive: '#10B981',
  negative: '#EF4444',
  amber: '#F59E0B',
  blue: '#3B82F6',
  teal: '#0D9488',
  navy: '#1E2761',
  muted: '#64748B',
  grid: '#E2E8F0',
}

function readVar(name: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(DEFAULTS)

  useEffect(() => {
    function sync() {
      setColors({
        positive: readVar('--data-positive') || DEFAULTS.positive,
        negative: readVar('--data-negative') || DEFAULTS.negative,
        amber: readVar('--data-amber') || DEFAULTS.amber,
        blue: readVar('--data-blue') || DEFAULTS.blue,
        teal: readVar('--accent-primary') || DEFAULTS.teal,
        navy: '#1E2761',
        muted: readVar('--text-muted') || DEFAULTS.muted,
        grid: readVar('--border-default') || DEFAULTS.grid,
      })
    }

    sync()

    // Re-sync when dark class is toggled on <html>
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return colors
}
```

- [ ] **Step 3: Read all 5 chart files**

```bash
cat app/components/charts/DailySalesChart.tsx
cat app/components/charts/OrganicVsPPCChart.tsx
cat app/components/charts/ACOSTrendChart.tsx
cat app/components/charts/SpendVsSalesChart.tsx
cat app/components/charts/SessionsConversionChart.tsx
```

Note every hardcoded `stroke`, `fill`, and card wrapper class.

- [ ] **Step 4: Migrate `app/components/charts/DailySalesChart.tsx`**

Add `'use client'` if not present. Add import and hook:

```tsx
'use client'

import { useChartColors } from '@/lib/hooks/use-chart-colors'

// Inside the component, before return:
const colors = useChartColors()
```

Replace in JSX:
- Card wrapper: any `bg-white border border-slate-200 rounded-*` → `bg-surface-card border border-border-default rounded-xl`
- `<CartesianGrid stroke="...">` → `<CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />`
- `XAxis tick={{ fill: '...' }}` → `tick={{ fontSize: 11, fill: colors.muted }}`
- `YAxis tick={{ fill: '...' }}` → `tick={{ fontSize: 11, fill: colors.muted }}`
- Line stroke color → `stroke={colors.teal}`
- `Tooltip contentStyle` → `{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }`

- [ ] **Step 5: Migrate `app/components/charts/OrganicVsPPCChart.tsx`**

Same `useChartColors` import + hook call. Replace:
- Card wrapper → `bg-surface-card border border-border-default rounded-xl`
- Organic bar fill → `fill={colors.teal}`
- PPC bar fill → `fill={colors.navy}`
- Grid stroke → `stroke={colors.grid}`
- Axis tick fills → `fill: colors.muted`
- Tooltip contentStyle → same as Step 4

- [ ] **Step 6: Migrate `app/components/charts/ACOSTrendChart.tsx`**

Same pattern. Replace:
- Card wrapper → `bg-surface-card border border-border-default rounded-xl`
- ACOS line stroke → `stroke={colors.amber}`
- ReferenceLine stroke → `stroke={colors.amber}`
- Grid stroke → `stroke={colors.grid}`
- Axis tick fills → `fill: colors.muted`
- Tooltip contentStyle → same as Step 4

- [ ] **Step 7: Migrate `app/components/charts/SpendVsSalesChart.tsx`**

Same pattern. Replace:
- Card wrapper → `bg-surface-card border border-border-default rounded-xl`
- Spend area stroke/fill → `stroke={colors.negative}` / `fill={colors.negative}`
- Sales area stroke/fill → `stroke={colors.positive}` / `fill={colors.positive}`
- Grid stroke → `stroke={colors.grid}`
- Axis tick fills → `fill: colors.muted`
- Tooltip contentStyle → same as Step 4

- [ ] **Step 8: Migrate `app/components/charts/SessionsConversionChart.tsx`**

Same pattern. Replace:
- Card wrapper → `bg-surface-card border border-border-default rounded-xl`
- Sessions line stroke → `stroke={colors.blue}`
- CVR line stroke → `stroke={colors.teal}`
- Grid stroke → `stroke={colors.grid}`
- Axis tick fills → `fill: colors.muted`
- Tooltip contentStyle → same as Step 4

- [ ] **Step 9: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Visual check — toggle dark mode**

Navigate to a brand page with chart data. Toggle dark mode. Charts should update reactively: grid lines → dark (`#1E2D45`), axis labels → dark muted, teal line → brighter teal (`#14B8A6`). No page refresh required.

- [ ] **Step 11: Commit**

```bash
git add app/lib/hooks/use-chart-colors.ts app/components/charts/
git commit -m "feat(design): theme-aware chart colors via useChartColors hook"
```

---

### Task 7: Command Center Page Migration

**Files:**
- Modify: `app/app/(dashboard)/dashboard/page.tsx`
- Modify: `app/components/dashboard/SortBar.tsx`

**Interfaces:**
- Consumes:
  - `KpiCard` from `@/components/ui/KpiCard` — `KpiCardProps` (Task 3)
  - `PageHeader` from `@/components/ui/PageHeader` (Task 4)
  - `SectionCard` from `@/components/ui/SectionCard` — `SectionCardProps` (Task 4)
  - `EmptyState` from `@/components/ui/EmptyState` — `EmptyStateProps` (Task 4)
  - `StatusBadge` from `@/components/ui/StatusBadge` — `StatusBadgeProps` (Task 3)

- [ ] **Step 1: Read `app/app/(dashboard)/dashboard/page.tsx` and `app/components/dashboard/SortBar.tsx`**

```bash
cat "app/app/(dashboard)/dashboard/page.tsx"
cat app/components/dashboard/SortBar.tsx
```

Note: every hardcoded hex, every `bg-white`, `border-slate-200`, `text-slate-*` class.

- [ ] **Step 2: Add imports to `app/app/(dashboard)/dashboard/page.tsx`**

```tsx
import { KpiCard } from '@/components/ui/KpiCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
```

- [ ] **Step 3: Replace portfolio KPI strip with `<KpiCard>` grid**

Find the section rendering portfolio-level stats (total sales, net revenue, PPC spend, blended ACOS, net after ads). Replace inline card divs with:

```tsx
<div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
  <KpiCard label="Total Sales" value={formatINR(totalSales)} sub="All brands" />
  <KpiCard label="Net Revenue" value={formatINR(totalNetRevenue)} />
  <KpiCard label="PPC Spend" value={formatINR(totalPPCSpend)} />
  <KpiCard
    label="Blended ACOS"
    value={blendedAcos !== null ? formatPercent(blendedAcos) : '—'}
    variant={blendedAcos !== null && blendedAcos > 0.3 ? 'warning' : 'positive'}
  />
  <KpiCard label="Net after Ads" value={formatINR(totalNetAfterAds)} />
</div>
```

(Adapt variable names to match what the file actually uses.)

- [ ] **Step 4: Replace page heading with `<PageHeader>`**

```tsx
<PageHeader title="Command Center" />
```

- [ ] **Step 5: Replace brand card shells with `<SectionCard>`**

Every `<div className="bg-white border border-slate-200 rounded-xl ...">` wrapping a brand → `<SectionCard>`.

- [ ] **Step 6: Replace inline empty state with `<EmptyState>`**

```tsx
<EmptyState
  icon="📦"
  title="No brands yet"
  description="Add your first brand in Settings."
  action={{ label: 'Go to Settings', href: '/settings' }}
/>
```

- [ ] **Step 7: Migrate `app/components/dashboard/SortBar.tsx`**

Replace active sort button classes:
- `bg-[#1E2761] text-white` → `bg-surface-sidebar text-text-on-brand`

Replace inactive sort button classes:
- `bg-white border border-slate-200 text-slate-600` → `bg-surface-card border border-border-default text-text-secondary`

- [ ] **Step 8: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Visual check**

Navigate to `/dashboard`. Toggle dark/light. Brand cards, KPI strip, empty state all render correctly in both modes. No hex literals in browser devtools inspector for any element on this page.

- [ ] **Step 10: Commit**

```bash
git add "app/app/(dashboard)/dashboard/page.tsx" app/components/dashboard/SortBar.tsx
git commit -m "feat(design): command center — KpiCard, PageHeader, SectionCard, token migration"
```

---

### Task 8: Brand Page Migration

**Files:**
- Modify: `app/app/(dashboard)/brands/[id]/page.tsx`
- Modify: `app/components/dashboard/AdvertisingKPIs.tsx`
- Modify: `app/components/dashboard/DateFilterBar.tsx`
- Modify: `app/components/dashboard/ProductTable.tsx`
- Modify: `app/components/dashboard/ProductsCOGSTable.tsx`

**Interfaces:**
- Consumes: `KpiCard`, `PageHeader`, `SectionCard`, `EmptyState`, `DataTable` (all from Tasks 3–4)

- [ ] **Step 1: Read all 5 files**

```bash
cat "app/app/(dashboard)/brands/[id]/page.tsx"
cat app/components/dashboard/AdvertisingKPIs.tsx
cat app/components/dashboard/DateFilterBar.tsx
cat app/components/dashboard/ProductTable.tsx
cat app/components/dashboard/ProductsCOGSTable.tsx
```

- [ ] **Step 2: Migrate `app/components/dashboard/AdvertisingKPIs.tsx`**

Add imports:
```tsx
import { KpiCard } from '@/components/ui/KpiCard'
import { EmptyState } from '@/components/ui/EmptyState'
```

Replace empty/no-data state:
```tsx
if (!hasPPC) {
  return (
    <div className="bg-accent-primary-subtle border border-accent-primary/20 rounded-xl p-5 mb-4">
      <EmptyState
        title="No advertising data yet"
        description="Upload your settlement file — the PPC Database tab is parsed automatically."
      />
    </div>
  )
}
```

Replace the 6-card PPC KPI strip. Match existing variable names (ppcSpend, ppcSales, organicSales, acos, roas, tacos):
```tsx
<div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
  <KpiCard label="PPC Spend" value={formatINR(ppcSpend)} sub="Ad cost" variant="negative" />
  <KpiCard label="PPC Sales" value={formatINR(ppcSales)} sub="Attributed" />
  <KpiCard label="Organic Sales" value={formatINR(organicSales)} sub="Non-ad revenue" variant="positive" />
  <KpiCard
    label="ACOS"
    value={acos !== null ? formatPercent(acos) : '—'}
    sub="Lower is better"
    variant={acos !== null ? (acos > 0.4 ? 'negative' : acos > 0.25 ? 'warning' : 'positive') : 'default'}
  />
  <KpiCard
    label="RoAS"
    value={roas !== null ? `${roas.toFixed(2)}x` : '—'}
    sub="Higher is better"
    variant={roas !== null ? (roas >= 4 ? 'positive' : roas >= 2 ? 'default' : 'negative') : 'default'}
  />
  <KpiCard
    label="TACoS"
    value={tacos !== null ? formatPercent(tacos) : '—'}
    sub="Total ad cost of sales"
    variant={tacos !== null && tacos > 0.15 ? 'warning' : 'positive'}
  />
</div>
```

- [ ] **Step 3: Migrate `app/app/(dashboard)/brands/[id]/page.tsx`**

Add imports:
```tsx
import { PageHeader } from '@/components/ui/PageHeader'
import { KpiCard } from '@/components/ui/KpiCard'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
```

Replace page header section:
```tsx
<PageHeader
  title={brand.name}
  breadcrumb={[{ label: 'Command Center', href: '/dashboard' }]}
  actions={
    <>
      <Link
        href={`/brands/${id}/keywords`}
        className="text-sm border border-border-default text-text-secondary font-medium px-4 py-2 rounded-lg hover:bg-surface-raised transition-colors"
      >
        Keywords
      </Link>
      <Link
        href={`/brands/${id}/upload`}
        className="text-sm bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        + Upload data
      </Link>
    </>
  }
/>
```

Replace P&L KPI strip (gross revenue, net revenue, amazon fees, cogs, net profit, margin) with `<KpiCard>` grid. Use `variant` based on values (net profit negative → `negative`, etc.).

Replace chart section wrapper `bg-white border border-slate-200 rounded-2xl` → `<SectionCard title="Performance" padding="lg">`.

Replace empty state divs → `<EmptyState>` with appropriate icon/title/description.

Remove all remaining `text-[#...]`, `bg-[#...]`, `border-[#...]`, `text-slate-*`, `bg-slate-*`, `border-slate-*` literals.

- [ ] **Step 4: Migrate `app/components/dashboard/DateFilterBar.tsx`**

Replace active preset chip: `bg-[#1E2761] text-white` → `bg-surface-sidebar text-text-on-brand`

Replace inactive chip: `bg-white border border-slate-200` → `bg-surface-card border border-border-default text-text-secondary`

Replace input fields: `border-slate-200 focus:ring-teal-500` → `border-border-default focus:ring-accent-primary bg-surface-card text-text-primary`

- [ ] **Step 5: Migrate `app/components/dashboard/ProductTable.tsx`**

Replace class-by-class:
- `bg-white` → `bg-surface-card`
- `border-slate-200` / `border-slate-100` → `border-border-default` / `border-border-subtle`
- `bg-slate-50` → `bg-surface-raised`
- `text-slate-500` / `text-slate-400` → `text-text-muted`
- `text-slate-800` / `text-slate-700` / `text-slate-600` → `text-text-primary` / `text-text-secondary`
- `divide-slate-100` / `divide-slate-200` → `divide-border-subtle` / `divide-border-default`
- `hover:bg-slate-50` → `hover:bg-surface-raised`

If the table structure is simple enough, replace with `<DataTable headers={[...]} >`. If it has complex sorting UI, keep the native table but use token classes.

- [ ] **Step 6: Migrate `app/components/dashboard/ProductsCOGSTable.tsx`**

Same token replacements as Step 5. Additionally:
- Input fields: `border-slate-200 focus:ring-teal-500` → `border-border-default focus:ring-accent-primary bg-surface-card text-text-primary`
- Save button: `bg-[#0D9488]` or `bg-teal-600` → `bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand`

- [ ] **Step 7: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Visual check**

Navigate to a brand page with data. Toggle dark/light. KPI cards, charts, product table all render correctly. No wrong-color elements.

- [ ] **Step 9: Commit**

```bash
git add "app/app/(dashboard)/brands/[id]/page.tsx" app/components/dashboard/AdvertisingKPIs.tsx app/components/dashboard/DateFilterBar.tsx app/components/dashboard/ProductTable.tsx app/components/dashboard/ProductsCOGSTable.tsx
git commit -m "feat(design): brand page + components — KpiCard, SectionCard, token migration"
```

---

### Task 9: Keywords + Alerts Pages Migration

**Files:**
- Modify: `app/app/(dashboard)/brands/[id]/keywords/KeywordsClient.tsx`
- Modify: `app/app/(dashboard)/alerts/page.tsx`
- Modify: `app/app/(dashboard)/brands/[id]/alerts/page.tsx`
- Modify: `app/components/alerts/AlertToast.tsx`
- Modify: `app/components/alerts/AlertConfig.tsx`

**Interfaces:**
- Consumes: `DataTable` (`DataTableHeader` — `{ label: string; align?: 'left' | 'right' | 'center' }`), `StatusBadge` (`BadgeColor` — `'green' | 'red' | 'amber' | 'blue' | 'slate' | 'teal'`), `EmptyState`, `PageHeader`, `SectionCard` (all from Tasks 3–4)

- [ ] **Step 1: Read all 5 files**

```bash
cat "app/app/(dashboard)/brands/[id]/keywords/KeywordsClient.tsx"
cat "app/app/(dashboard)/alerts/page.tsx"
cat "app/app/(dashboard)/brands/[id]/alerts/page.tsx"
cat app/components/alerts/AlertToast.tsx
cat app/components/alerts/AlertConfig.tsx
```

- [ ] **Step 2: Migrate `KeywordsClient.tsx`**

Add imports:
```tsx
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge, BadgeColor } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
```

Add match-type color helper:
```tsx
function matchColor(type: string | null): BadgeColor {
  if (!type) return 'slate'
  const map: Record<string, BadgeColor> = {
    Exact: 'green',
    Phrase: 'blue',
    Broad: 'amber',
    Auto: 'slate',
  }
  return map[type] ?? 'slate'
}
```

Replace targeting table with `<DataTable>`:
```tsx
<DataTable headers={[
  { label: 'Keyword / Target' },
  { label: 'Match' },
  { label: 'Spend', align: 'right' },
  { label: 'Sales', align: 'right' },
  { label: 'ACOS', align: 'right' },
  { label: 'RoAS', align: 'right' },
  { label: 'Orders', align: 'right' },
  { label: 'Clicks', align: 'right' },
]}>
  {rows.map((r, i) => (
    <tr key={i} className="hover:bg-surface-raised transition-colors">
      <td className="px-4 py-2.5 font-medium text-text-primary max-w-[200px] truncate">
        {r.targeting ?? '—'}
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge label={r.match_type ?? '—'} color={matchColor(r.match_type)} />
      </td>
      <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{formatINR(r.spend)}</td>
      <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{formatINR(r.sales)}</td>
      <td className="px-4 py-2.5 text-right tabular-nums">
        <span className={r.acos && r.acos > 0.4 ? 'text-data-negative' : r.acos && r.acos > 0.25 ? 'text-data-amber' : 'text-data-positive'}>
          {r.acos !== null ? formatPercent(r.acos) : '—'}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{r.roas !== null ? `${r.roas.toFixed(2)}x` : '—'}</td>
      <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{r.orders ?? 0}</td>
      <td className="px-4 py-2.5 text-right text-text-secondary tabular-nums">{r.clicks ?? 0}</td>
    </tr>
  ))}
</DataTable>
```

Replace empty state:
```tsx
<EmptyState
  icon="🔍"
  title="No targeting data yet"
  description="Upload a Targeting report above to get started."
/>
```

Replace tab pills: active `bg-white shadow-sm text-slate-800` → `bg-surface-card shadow-sm text-text-primary`; inactive `text-slate-500` → `text-text-muted`.

Replace upload zone shell: `bg-white border border-slate-200` → `bg-surface-card border border-border-default`.

- [ ] **Step 3: Migrate alerts pages**

For both `app/app/(dashboard)/alerts/page.tsx` and `app/app/(dashboard)/brands/[id]/alerts/page.tsx`:

Add imports:
```tsx
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatusBadge, BadgeColor } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
```

Add severity color helper:
```tsx
function severityColor(severity: string): BadgeColor {
  if (severity === 'critical') return 'red'
  if (severity === 'warning') return 'amber'
  return 'blue'
}
```

Replace severity badge inline span → `<StatusBadge label={alert.severity} color={severityColor(alert.severity)} size="md" />`.

Replace card shell → `<SectionCard>`.

Replace page `<h1>` → `<PageHeader title="Alerts" />`.

Replace empty states → `<EmptyState icon="🔔" title="No alerts" description="All clear — no active alerts." />`.

Replace color-coded alert bg:
- `bg-red-50 border-red-200 text-red-600` → `bg-data-negative/5 border-data-negative/20 text-data-negative`
- `bg-amber-50 border-amber-200 text-amber-700` → `bg-data-amber/5 border-data-amber/20 text-data-amber`
- `bg-blue-50 border-blue-200 text-blue-700` → `bg-data-blue/5 border-data-blue/20 text-data-blue`

- [ ] **Step 4: Migrate `AlertToast.tsx` and `AlertConfig.tsx`**

Same token replacements:
- `bg-white border border-slate-200` → `bg-surface-card border border-border-default`
- `text-slate-*` → `text-text-*`
- `bg-[#0D9488]` / `bg-teal-*` → `bg-accent-primary hover:bg-accent-primary-hover`
- Input fields: `border-slate-200` → `border-border-default bg-surface-card text-text-primary`
- `focus:ring-teal-500` → `focus:ring-accent-primary`

- [ ] **Step 5: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/app/(dashboard)/brands/[id]/keywords/" "app/app/(dashboard)/alerts/" app/components/alerts/
git commit -m "feat(design): keywords + alerts — DataTable, StatusBadge, EmptyState, token migration"
```

---

### Task 10: Upload + Settings + Auth Pages Migration

**Files:**
- Modify: `app/app/(dashboard)/brands/[id]/upload/page.tsx`
- Modify: `app/app/(dashboard)/brands/[id]/settings/page.tsx`
- Modify: `app/app/(dashboard)/settings/page.tsx`
- Modify: `app/app/(auth)/login/page.tsx`
- Modify: `app/app/(auth)/signup/page.tsx`
- Modify: `app/components/settings/SyncControls.tsx`
- Modify: `app/components/settings/ScheduleConfig.tsx`
- Modify: `app/components/settings/DisconnectButton.tsx`

**Interfaces:**
- Consumes: `PageHeader`, `SectionCard` (Task 4)

- [ ] **Step 1: Read all files**

```bash
cat "app/app/(dashboard)/brands/[id]/upload/page.tsx"
cat "app/app/(dashboard)/brands/[id]/settings/page.tsx"
cat "app/app/(dashboard)/settings/page.tsx"
cat "app/app/(auth)/login/page.tsx"
cat "app/app/(auth)/signup/page.tsx"
cat app/components/settings/SyncControls.tsx
cat app/components/settings/ScheduleConfig.tsx
cat app/components/settings/DisconnectButton.tsx
```

- [ ] **Step 2: Migrate upload page**

Add imports:
```tsx
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
```

Replace page header → `<PageHeader title="Upload Data" breadcrumb={[{ label: 'Command Center', href: '/dashboard' }, { label: brand.name, href: `/brands/${id}` }]} />`.

Replace card shell `bg-white border border-slate-200 rounded-2xl p-8` → `<SectionCard padding="lg">`.

Replace drag-drop zone: `border-slate-300 bg-slate-50` → `border-border-default bg-surface-raised`.

Replace upload button: `bg-[#0D9488]` → `bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand`.

Replace file type badge pills: any `bg-slate-100 text-slate-600` → `bg-surface-raised text-text-muted`.

Replace `bg-[#F8FAFC]` → `bg-surface-page`.

- [ ] **Step 3: Migrate settings pages**

For `app/app/(dashboard)/brands/[id]/settings/page.tsx` and `app/app/(dashboard)/settings/page.tsx`:

Add imports:
```tsx
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'
```

Replace `<h1>` → `<PageHeader title="Settings" />`.

Replace card shells → `<SectionCard title="..." padding="lg">`.

Replace buttons: `bg-[#0D9488]` / `bg-teal-600` → `bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand`.

Replace inputs: `border-slate-200 focus:ring-teal-500` → `border-border-default focus:ring-accent-primary bg-surface-card text-text-primary`.

Replace `text-slate-*` → matching `text-text-*`.

- [ ] **Step 4: Migrate `SyncControls.tsx`, `ScheduleConfig.tsx`, `DisconnectButton.tsx`**

Same token replacements:
- `bg-white border border-slate-*` → `bg-surface-card border border-border-default`
- `text-slate-*` → `text-text-*`
- `bg-[#0D9488]` / `bg-teal-*` → `bg-accent-primary hover:bg-accent-primary-hover`
- `bg-red-600` (disconnect button) → `bg-data-negative hover:opacity-90`
- Inputs: `border-slate-200` → `border-border-default bg-surface-card text-text-primary`

- [ ] **Step 5: Migrate auth pages**

For `app/app/(auth)/login/page.tsx` and `app/app/(auth)/signup/page.tsx`:

```tsx
// Page wrapper
<div className="min-h-screen bg-surface-page flex items-center justify-center px-4">

// Logo
<h1 className="text-3xl font-extrabold text-surface-sidebar">
  Merch<span className="text-accent-primary">Man</span>
</h1>

// Card
<div className="bg-surface-card rounded-2xl shadow-sm border border-border-default p-8 w-full max-w-md">

// Label
<label className="block text-xs font-medium text-text-secondary mb-1">

// Input
<input className="w-full px-3 py-2.5 border border-border-default bg-surface-card text-text-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent placeholder-text-muted" />

// Submit button
<button className="w-full bg-accent-primary hover:bg-accent-primary-hover text-text-on-brand font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50">

// Error message
<p className="text-sm text-data-negative bg-data-negative/10 px-3 py-2 rounded-lg">

// Link
<a className="text-accent-primary hover:text-accent-primary-hover">
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "app/app/(dashboard)/brands/[id]/upload/" "app/app/(dashboard)/brands/[id]/settings/" "app/app/(dashboard)/settings/" "app/app/(auth)/" app/components/settings/
git commit -m "feat(design): upload + settings + auth pages — token migration"
```

---

### Task 11: Final Verification + Cleanup

**Files:**
- None created/modified — verification only

- [ ] **Step 1: Grep for remaining hardcoded hex in component files**

```bash
cd app && grep -rn "#1E2761\|#0D9488\|#16205a\|#14B8A6\|#F8FAFC\|text-slate-\|bg-slate-\|border-slate-\|text-teal-\|bg-teal-\|focus:ring-teal-" --include="*.tsx" --include="*.ts" -l | grep -v node_modules | grep -v globals.css | grep -v ".next"
```

Expected: **no output**. If files appear, open each and replace remaining literals with appropriate token classes using the substitution table:

| Old class | Token class |
|---|---|
| `text-slate-800`, `text-slate-900` | `text-text-primary` |
| `text-slate-600`, `text-slate-700` | `text-text-secondary` |
| `text-slate-400`, `text-slate-500` | `text-text-muted` |
| `bg-slate-50`, `bg-slate-100` | `bg-surface-raised` |
| `bg-white` | `bg-surface-card` |
| `border-slate-100`, `border-slate-200` | `border-border-default` |
| `divide-slate-100` | `divide-border-subtle` |
| `bg-[#1E2761]` | `bg-surface-sidebar` |
| `text-[#1E2761]` | `text-surface-sidebar` |
| `bg-[#0D9488]` | `bg-accent-primary` |
| `text-[#0D9488]` | `text-accent-primary` |
| `hover:bg-[#0D9488]` | `hover:bg-accent-primary-hover` |
| `focus:ring-teal-500` | `focus:ring-accent-primary` |
| `bg-teal-600`, `bg-teal-700` | `bg-accent-primary` |
| `text-teal-600` | `text-accent-primary` |

- [ ] **Step 2: Full TypeScript check**

```bash
cd app && npx tsc --noEmit 2>&1
```

Expected: clean exit, zero errors. If errors, fix before proceeding.

- [ ] **Step 3: Visual full tour — light mode**

Navigate through every page in light mode:
- `/dashboard` — Command Center
- `/brands/[id]` — Brand page (use a brand that has data)
- `/brands/[id]/keywords` — Keywords
- `/alerts` — Alerts
- `/settings` — Settings
- `/login` — Login (incognito or logout first)

Check: cards have white backgrounds, text is `#0D1117`, sidebar is navy.

- [ ] **Step 4: Visual full tour — dark mode**

Toggle dark mode in sidebar. Navigate same pages. Check:
- Page bg: `#0A0E1A`
- Cards: `#111827`
- Sidebar: `#0D1117`
- Text: `#E2E8F0`
- Borders: `#1E2D45`
- Teal accents: `#14B8A6`

- [ ] **Step 5: Theme persistence check**

1. Toggle dark mode
2. Hard refresh (`Cmd+Shift+R`)
3. Page must load in dark without any flash of light

- [ ] **Step 6: Final commit + push**

```bash
cd app && git add -A && git commit -m "feat(design): design system complete — tokens, 6 primitives, dark mode, full migration" && git push
```

---

## Self-Review

**Spec coverage:**
- ✅ Two-layer token system (primitives + semantics) — Task 1
- ✅ shadcn variable remapping — Task 1
- ✅ Tailwind `@theme inline` registration — Task 1
- ✅ ThemeProvider + ThemeToggle + anti-flash — Task 2
- ✅ `useChartColors` hook with MutationObserver — Task 6
- ✅ All 6 primitives (KpiCard, StatusBadge, PageHeader, SectionCard, EmptyState, DataTable) — Tasks 3–4
- ✅ Sidebar Lucide icons + ThemeToggle footer — Task 5
- ✅ Migration order matches spec §5 (globals → theme → primitives → sidebar → charts → pages) — Tasks 1–10
- ✅ Final hex grep verification — Task 11
- ✅ All primitives have `className?` prop — Tasks 3–4
- ✅ `tsc --noEmit` after every task
- ✅ Zero new npm packages

**Type consistency:**
- `KpiCard.variant` defined as `'default' | 'positive' | 'negative' | 'warning'` in Task 3, used with same values in Tasks 7–8 ✅
- `StatusBadge.color` typed as `BadgeColor = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'teal'` in Task 3, used correctly in Task 9 ✅
- `DataTable.headers` typed as `DataTableHeader[]` in Task 4, used with `{ label, align }` in Task 9 ✅
- `EmptyState.action` typed as `{ label: string; href?: string; onClick?: () => void }` in Task 4, used correctly in Tasks 7–10 ✅
- `useChartColors()` returns `ChartColors` with `positive/negative/amber/blue/teal/navy/muted/grid` — all consumed with exact same keys in Tasks 6 chart migrations ✅

**No placeholders found.** All code steps include complete implementations.
