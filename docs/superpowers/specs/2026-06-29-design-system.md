# MerchMan Design System — Implementation Spec

> **For agentic workers:** Use `superpowers:writing-plans` to convert this spec into an implementation plan before touching code.

**Goal:** Replace 40+ files of hardcoded hex colors with a two-layer token system, build 6 shared primitive components, and add light/dark mode — structured so each future improvement slots in without rework.

**Visual direction:** Bloomberg Terminal meets modern SaaS. Dark mode is first-class. Data-dense, high contrast, numbers front and center. Reference: openclaw.ai aesthetic + Bloomberg terminal palette.

**Approach chosen:** B — Token system + shared primitives. Designed to make future phase C (full shadcn retheme) a component-swap with zero token changes.

---

## Global Constraints

- Next.js 16 App Router — no `"use client"` unless state/events required
- Tailwind v4 — use `@theme inline` block in `globals.css` for token registration
- shadcn/ui installed — tokens must remap shadcn semantic variables so shadcn components inherit theme for free
- Zero hardcoded hex in component files after migration
- All primitives accept `className` prop for overrides
- `tsc --noEmit` must stay clean after each task
- Lucide React already installed (via shadcn dep) — use for icons, replace emoji nav icons
- No new npm packages required

---

## 1. Token Architecture

### File: `app/globals.css`

Two-layer system:

**Layer 1 — Primitive tokens** (raw values, defined once, never used directly in JSX):

```css
:root {
  --brand-navy: #1E2761;
  --brand-navy-dark: #16205a;
  --brand-teal: #0D9488;
  --brand-teal-bright: #14B8A6;
  --brand-teal-muted: #0D9488/20;
}
```

**Layer 2 — Semantic tokens** (what components use, differ per mode):

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--surface-page` | `#F0F2F7` | `#0A0E1A` | Page background |
| `--surface-card` | `#FFFFFF` | `#111827` | Card/panel background |
| `--surface-raised` | `#F8FAFC` | `#1A2236` | Table header, input bg |
| `--surface-sidebar` | `#1E2761` | `#0D1117` | Sidebar (brand constant, darker in dark) |
| `--text-primary` | `#0D1117` | `#E2E8F0` | Body text |
| `--text-secondary` | `#374151` | `#94A3B8` | Sub-labels |
| `--text-muted` | `#64748B` | `#4B5563` | Hints, metadata |
| `--text-on-brand` | `#FFFFFF` | `#FFFFFF` | Text on navy/teal backgrounds |
| `--border-default` | `#E2E8F0` | `#1E2D45` | Cards, inputs |
| `--border-subtle` | `#F1F5F9` | `#111827` | Table dividers |
| `--accent-primary` | `#0D9488` | `#14B8A6` | CTA buttons, links, active nav |
| `--accent-primary-hover` | `#0F766E` | `#0D9488` | Hover state |
| `--accent-primary-subtle` | `#F0FDFA` | `#042F2E` | Teal-tinted bg (empty states, banners) |
| `--data-positive` | `#10B981` | `#10B981` | Revenue, good ACOS, up trends |
| `--data-negative` | `#EF4444` | `#EF4444` | Losses, high spend, wasted |
| `--data-amber` | `#F59E0B` | `#F59E0B` | Warning, medium ACOS, attention |
| `--data-blue` | `#3B82F6` | `#60A5FA` | Neutral metric, impressions, clicks |

**shadcn variable remapping** — add inside `:root` and `.dark`:
```css
--background: var(--surface-page);
--foreground: var(--text-primary);
--card: var(--surface-card);
--card-foreground: var(--text-primary);
--border: var(--border-default);
--primary: var(--accent-primary);
--primary-foreground: var(--text-on-brand);
--muted: var(--surface-raised);
--muted-foreground: var(--text-muted);
--ring: var(--accent-primary);
```

### Tailwind `@theme inline` additions

Register semantic tokens as Tailwind utilities so `bg-surface-card`, `text-text-muted`, `border-border-default` etc. work as classes:

```css
@theme inline {
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
}
```

---

## 2. Dark Mode Implementation

### File: `app/layout.tsx`

Add inline script before `<body>` to prevent flash of wrong theme:

```tsx
<script dangerouslySetInnerHTML={{
  __html: `(function(){var t=localStorage.getItem('mm_theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})();`
}} />
```

### File: `components/ThemeProvider.tsx`

```tsx
'use client'
import { useEffect } from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Sync toggle button state only — class already set by inline script
  }, [])
  return <>{children}</>
}
```

### File: `components/ThemeToggle.tsx`

Client component. Sun icon (light mode) / Moon icon (dark mode) using Lucide. Toggles `.dark` on `document.documentElement`, persists to `localStorage('mm_theme')`.

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
    <button onClick={toggle} className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
```

Added to `Sidebar.tsx` footer, next to version string.

### Chart colors

`useChartColors()` hook in `lib/hooks/use-chart-colors.ts`:

```ts
export function useChartColors() {
  // reads computed CSS var values at runtime
  const style = typeof window !== 'undefined'
    ? getComputedStyle(document.documentElement)
    : null
  return {
    positive: style?.getPropertyValue('--data-positive').trim() ?? '#10B981',
    negative: style?.getPropertyValue('--data-negative').trim() ?? '#EF4444',
    amber: style?.getPropertyValue('--data-amber').trim() ?? '#F59E0B',
    blue: style?.getPropertyValue('--data-blue').trim() ?? '#3B82F6',
    navy: '#1E2761',
    teal: style?.getPropertyValue('--accent-primary').trim() ?? '#0D9488',
  }
}
```

Charts import this hook instead of hardcoding stroke/fill colors.

---

## 3. Shared Primitive Components

All live in `components/ui/` (extends shadcn's existing `components/ui/button.tsx`).

### 3.1 `KpiCard` — `components/ui/KpiCard.tsx`

**Replaces:** both the teal `AdvertisingKPIs` strip and navy P&L strip.

```tsx
interface KpiCardProps {
  label: string
  value: string
  sub?: string
  trend?: number        // positive = green, negative = red
  variant?: 'default' | 'positive' | 'negative' | 'warning'
  className?: string
}
```

**Visual:** `bg-surface-card border border-border-default` base. Value text: `text-text-primary` (default), `text-data-positive` (positive), `text-data-negative` (negative), `text-data-amber` (warning). Trend shows `↑ 12%` / `↓ 8%` in matching color. Label: `text-text-muted text-xs`. Sub: `text-text-muted text-xs`.

Tabular numeric font on value: `font-variant-numeric: tabular-nums`.

### 3.2 `PageHeader` — `components/ui/PageHeader.tsx`

**Replaces:** repeated `flex items-center justify-between mb-4` + breadcrumb + h1 pattern on every page.

```tsx
interface PageHeaderProps {
  title: string
  breadcrumb?: { label: string; href: string }[]
  actions?: React.ReactNode
  className?: string
}
```

**Visual:** `text-text-primary text-2xl font-bold` for title. Breadcrumb: `text-text-muted text-sm` with `›` separator. Actions slot right-aligned.

### 3.3 `SectionCard` — `components/ui/SectionCard.tsx`

**Replaces:** `bg-white border border-slate-200 rounded-xl p-*` used ~15 times.

```tsx
interface SectionCardProps {
  title?: string
  action?: React.ReactNode
  padding?: 'sm' | 'md' | 'lg'   // p-3 | p-4 | p-6
  children: React.ReactNode
  className?: string
}
```

**Visual:** `bg-surface-card border border-border-default rounded-xl`. Title: `text-text-primary text-sm font-semibold`. Action slot right of title.

### 3.4 `DataTable` — `components/ui/DataTable.tsx`

**Replaces:** 5 inconsistent table implementations (ProductTable, KeywordsClient, ProductsCOGSTable, etc.).

```tsx
interface DataTableProps {
  headers: { label: string; align?: 'left' | 'right' | 'center' }[]
  children: React.ReactNode   // <tr> rows passed as children
  className?: string
}
```

**Visual:** `bg-surface-card border border-border-default rounded-xl overflow-hidden`. `<thead>`: `bg-surface-raised text-text-muted text-xs font-medium`. `<tbody>`: `divide-y divide-border-subtle`. Row hover: `hover:bg-surface-raised transition-colors`.

### 3.5 `StatusBadge` — `components/ui/StatusBadge.tsx`

**Replaces:** inline badge implementations in keywords page, alerts page, settings page.

```tsx
interface StatusBadgeProps {
  label: string
  color: 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'teal'
  size?: 'sm' | 'md'
  className?: string
}
```

**Visual:** pill shape, `text-[10px] font-medium px-1.5 py-0.5 rounded-full`. Each color maps to a semantic pair (e.g. green → `bg-data-positive/10 text-data-positive`).

### 3.6 `EmptyState` — `components/ui/EmptyState.tsx`

**Replaces:** 6 one-off empty state blocks across the app.

```tsx
interface EmptyStateProps {
  icon?: string              // emoji or Lucide icon node
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
  className?: string
}
```

**Visual:** centered layout, `py-16`. Icon: `text-3xl mb-3`. Title: `text-text-primary text-sm font-semibold`. Description: `text-text-muted text-xs mt-1`. Action: teal button if provided.

---

## 4. Sidebar Refresh

`components/dashboard/Sidebar.tsx` changes:

- Replace emoji nav icons with Lucide: `Zap` (Command Center), `Tag` (Brands), `Bell` (Alerts)
- Nav active state: `bg-white/15 text-white` → keep (already good)
- Nav inactive: `text-white/60` → keep
- Logo: keep `Merch<span>Man</span>` with teal accent
- Footer: add `ThemeToggle` component + version string
- Sidebar bg: `bg-surface-sidebar` (token, same navy in light, slightly darker in dark)

---

## 5. Migration Order

Migrate pages in this order — each independently testable:

1. **`globals.css`** — add all tokens, remap shadcn vars (no visual change yet)
2. **`ThemeProvider` + `ThemeToggle`** — dark mode works end to end
3. **6 primitive components** — build all, zero pages migrated yet
4. **Sidebar** — Lucide icons + ThemeToggle
5. **Command Center** (`dashboard/page.tsx`) — use `KpiCard`, `PageHeader`, `SectionCard`
6. **Brand Page** (`brands/[id]/page.tsx`) — largest file, most KPI cards
7. **Keywords Page** — `DataTable`, `StatusBadge`, `EmptyState`
8. **Alerts Page** — `StatusBadge`, `SectionCard`
9. **Upload + Settings pages** — `PageHeader`, `SectionCard`
10. **Auth pages** — `SectionCard` for card shell
11. **Charts** — wire `useChartColors()` hook into all 5 chart components

---

## 6. Phase C Upgrade Path (future)

When ready to go full shadcn:

- `KpiCard` → shadcn `Card` + `CardContent` (tokens already compatible)
- `StatusBadge` → shadcn `Badge` (just swap internals)
- `DataTable` → shadcn `Table` (same token layer)
- `SectionCard` → shadcn `Card` with `CardHeader`
- `EmptyState` → keep (no shadcn equivalent)
- `PageHeader` → keep (no shadcn equivalent)

Zero token changes required. Only component internals swap.

---

## 7. File Map

| Action | File |
|---|---|
| Modify | `app/globals.css` |
| Modify | `app/layout.tsx` |
| Create | `components/ThemeProvider.tsx` |
| Create | `components/ThemeToggle.tsx` |
| Create | `lib/hooks/use-chart-colors.ts` |
| Create | `components/ui/KpiCard.tsx` |
| Create | `components/ui/PageHeader.tsx` |
| Create | `components/ui/SectionCard.tsx` |
| Create | `components/ui/DataTable.tsx` |
| Create | `components/ui/StatusBadge.tsx` |
| Create | `components/ui/EmptyState.tsx` |
| Modify | `components/dashboard/Sidebar.tsx` |
| Modify | `components/dashboard/AdvertisingKPIs.tsx` |
| Modify | `app/(dashboard)/dashboard/page.tsx` |
| Modify | `app/(dashboard)/brands/[id]/page.tsx` |
| Modify | `app/(dashboard)/brands/[id]/keywords/KeywordsClient.tsx` |
| Modify | `app/(dashboard)/alerts/page.tsx` |
| Modify | `app/(dashboard)/brands/[id]/alerts/page.tsx` |
| Modify | `app/(dashboard)/brands/[id]/upload/page.tsx` |
| Modify | `app/(dashboard)/brands/[id]/settings/page.tsx` |
| Modify | `app/(dashboard)/settings/page.tsx` |
| Modify | `app/(auth)/login/page.tsx` |
| Modify | `app/(auth)/signup/page.tsx` |
| Modify | `components/charts/ACOSTrendChart.tsx` |
| Modify | `components/charts/DailySalesChart.tsx` |
| Modify | `components/charts/OrganicVsPPCChart.tsx` |
| Modify | `components/charts/SessionsConversionChart.tsx` |
| Modify | `components/charts/SpendVsSalesChart.tsx` |
| Modify | `components/dashboard/ProductTable.tsx` |
| Modify | `components/dashboard/ProductsCOGSTable.tsx` |

---

## 8. Definition of Done

- `tsc --noEmit` clean
- Zero `#1E2761` or `#0D9488` hex literals remaining in component files
- Light mode visually matches current feel (no regression)
- Dark mode toggle works, persists across page refresh
- All 6 primitives render correctly in both modes
- Charts use theme-aware colors in dark mode
- `components/ui/` exports all 6 primitives cleanly
