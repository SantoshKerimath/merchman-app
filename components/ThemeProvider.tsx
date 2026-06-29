'use client'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Class is set by the inline script in layout.tsx before React hydrates.
  // This component is a mount point for future server-side preference persistence.
  return <>{children}</>
}
