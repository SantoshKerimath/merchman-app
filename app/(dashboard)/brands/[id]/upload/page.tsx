'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionCard } from '@/components/ui/SectionCard'

interface UploadResult {
  success?: boolean
  inserted?: number
  ppc_campaigns?: number
  skipped?: number
  errors?: string[]
  error?: string
  brand?: string
}

export default function UploadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(f: File) {
    setFile(f)
    setResult(null)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setResult(null)

    const form = new FormData()
    form.append('file', file)

    const res = await fetch(`/api/brands/${id}/upload`, {
      method: 'POST',
      body: form,
    })
    const data: UploadResult = await res.json()
    setResult(data)
    setUploading(false)

    if (data.success) {
      setTimeout(() => router.push(`/brands/${id}`), 2000)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Upload settlement data" />
      <p className="text-sm text-text-secondary -mt-4 mb-6">
        Upload your Amazon settlement XLSX file (Sales Database sheet). Supports the Growz Scalers format.
      </p>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-accent-primary bg-accent-primary-subtle' : 'border-border-default bg-surface-raised hover:border-accent-primary'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <div className="text-4xl mb-3">📊</div>
        {file ? (
          <>
            <p className="font-semibold text-text-primary">{file.name}</p>
            <p className="text-sm text-text-muted mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-text-primary">Drop your XLSX file here</p>
            <p className="text-sm text-text-muted mt-1">or click to browse</p>
            <p className="text-xs text-text-muted mt-3">
              Supports: P&L Sheet (Sales Database tab), Amazon settlement flat file
            </p>
          </>
        )}
      </div>

      {/* Upload button */}
      {file && !result?.success && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full mt-4 bg-accent-primary text-text-on-brand font-semibold py-3 rounded-xl hover:bg-accent-primary-hover transition-colors disabled:opacity-50"
        >
          {uploading ? 'Importing data…' : `Import "${file.name}"`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className={`mt-4 p-5 rounded-xl border ${
          result.success
            ? 'bg-data-positive/10 border-border-default'
            : 'bg-data-negative/10 border-border-default'
        }`}>
          {result.success ? (
            <>
              <p className="font-semibold text-data-positive">✅ Import successful</p>
              <p className="text-sm text-data-positive mt-1">
                {result.inserted?.toLocaleString()} rows imported for {result.brand}
              </p>
              {(result.ppc_campaigns ?? 0) > 0 && (
                <p className="text-sm text-data-positive mt-0.5">
                  {result.ppc_campaigns?.toLocaleString()} PPC campaigns imported
                </p>
              )}
              {result.skipped && result.skipped > 0 && (
                <p className="text-xs text-data-positive mt-1">{result.skipped} empty rows skipped</p>
              )}
              <p className="text-xs text-data-positive mt-2">Redirecting to dashboard…</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-data-negative">Import failed</p>
              <p className="text-sm text-data-negative mt-1">{result.error}</p>
              {result.errors?.map((e, i) => (
                <p key={i} className="text-xs text-data-negative mt-1">{e}</p>
              ))}
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      <SectionCard className="mt-6" padding="md">
        <p className="text-xs font-semibold text-text-secondary mb-2">HOW TO EXPORT FROM GROWZ SCALERS SHEET</p>
        <ol className="text-xs text-text-muted space-y-1 list-decimal list-inside">
          <li>Open the Google Sheet</li>
          <li>Go to the <strong>Sales Database</strong> tab</li>
          <li>File → Download → Microsoft Excel (.xlsx)</li>
          <li>Upload that file here</li>
        </ol>
      </SectionCard>
    </div>
  )
}
