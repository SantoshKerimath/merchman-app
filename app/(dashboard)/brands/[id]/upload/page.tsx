'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface UploadResult {
  success?: boolean
  inserted?: number
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
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-500 hover:text-slate-700 mb-3 flex items-center gap-1"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-[#1E2761]">Upload settlement data</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload your Amazon settlement XLSX file (Sales Database sheet). Supports the Growz Scalers format.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300'
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
            <p className="font-semibold text-slate-700">{file.name}</p>
            <p className="text-sm text-slate-400 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-slate-700">Drop your XLSX file here</p>
            <p className="text-sm text-slate-400 mt-1">or click to browse</p>
            <p className="text-xs text-slate-300 mt-3">
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
          className="w-full mt-4 bg-[#0D9488] text-white font-semibold py-3 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Importing data…' : `Import "${file.name}"`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className={`mt-4 p-5 rounded-xl border ${
          result.success
            ? 'bg-teal-50 border-teal-200'
            : 'bg-red-50 border-red-200'
        }`}>
          {result.success ? (
            <>
              <p className="font-semibold text-teal-800">✅ Import successful</p>
              <p className="text-sm text-teal-700 mt-1">
                {result.inserted?.toLocaleString()} rows imported for {result.brand}
              </p>
              {result.skipped && result.skipped > 0 && (
                <p className="text-xs text-teal-500 mt-1">{result.skipped} empty rows skipped</p>
              )}
              <p className="text-xs text-teal-500 mt-2">Redirecting to dashboard…</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-red-800">Import failed</p>
              <p className="text-sm text-red-700 mt-1">{result.error}</p>
              {result.errors?.map((e, i) => (
                <p key={i} className="text-xs text-red-500 mt-1">{e}</p>
              ))}
            </>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-slate-600 mb-2">HOW TO EXPORT FROM GROWZ SCALERS SHEET</p>
        <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
          <li>Open the Google Sheet</li>
          <li>Go to the <strong>Sales Database</strong> tab</li>
          <li>File → Download → Microsoft Excel (.xlsx)</li>
          <li>Upload that file here</li>
        </ol>
      </div>
    </div>
  )
}
