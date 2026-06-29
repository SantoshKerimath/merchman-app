'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  brandId: string
  isPinned: boolean
}

export default function PinButton({ brandId, isPinned }: Props) {
  const router = useRouter()
  const [pinned, setPinned] = useState(isPinned)
  const [flash, setFlash] = useState<'error' | null>(null)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation() // prevents Link navigation from firing

    const next = !pinned
    setPinned(next) // optimistic

    const res = await fetch(`/api/brands/${brandId}/pin`, { method: 'PATCH' })
    if (!res.ok) {
      setPinned(pinned) // revert
      setFlash('error')
      setTimeout(() => setFlash(null), 1500)
      return
    }
    router.refresh() // re-renders server list in new sort order
  }

  return (
    <button
      onClick={toggle}
      title={pinned ? 'Unpin brand' : 'Pin brand to top'}
      className={`absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
        flash === 'error'
          ? 'text-red-400'
          : pinned
          ? 'text-amber-400 hover:text-amber-500'
          : 'text-text-muted hover:text-text-secondary'
      }`}
    >
      📌
    </button>
  )
}
