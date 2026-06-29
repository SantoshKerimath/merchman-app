// app/components/settings/DisconnectButton.tsx
'use client'

interface Props {
  brandId: string
}

export default function DisconnectButton({ brandId }: Props) {
  async function handleDisconnect() {
    if (!confirm('Disconnect Amazon account? Scheduled syncs will stop.')) return
    await fetch(`/api/brands/${brandId}/credentials`, { method: 'DELETE' })
    window.location.reload()
  }

  return (
    <button
      onClick={handleDisconnect}
      className="text-xs text-data-negative hover:opacity-80 font-medium transition-opacity"
    >
      Disconnect
    </button>
  )
}
