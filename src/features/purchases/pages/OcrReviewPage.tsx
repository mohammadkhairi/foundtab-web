import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'

type OcrResult = {
  uploadId: string
  merchant: string | null
  date: string | null
  totalAmount: number | null
  items: OcrItem[]
}

type OcrItem = {
  description: string
  quantity: number | null
  unit: string | null
  unitPrice: number | null
  totalPrice: number | null
}

type FieldState = {
  merchant: string
  date: string
  totalAmount: string
}

export default function OcrReviewPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<'upload' | 'review' | 'saving'>('upload')
  const [uploading, setUploading] = useState(false)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [fields, setFields] = useState<FieldState>({ merchant: '', date: '', totalAmount: '' })
  const [error, setError] = useState<string | null>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const result = await apiFetch<OcrResult>('/api/v1/uploads/receipt-ocr', {
        method: 'POST',
        body: formData,
        token,
        headers: {}, // let browser set Content-Type for multipart
      })
      setOcrResult(result)
      setFields({
        merchant: result.merchant ?? '',
        date: result.date ?? '',
        totalAmount: result.totalAmount !== null ? String(result.totalAmount) : '',
      })
      setPhase('review')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Gagal memuat naik resit. Cuba lagi.')
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleConfirm() {
    if (!ocrResult) return
    setPhase('saving')
    setError(null)

    try {
      await apiFetch('/api/v1/purchases', {
        method: 'POST',
        body: JSON.stringify({
          uploadId: ocrResult.uploadId,
          merchant: fields.merchant || null,
          date: fields.date || null,
          totalAmount: fields.totalAmount !== '' ? parseFloat(fields.totalAmount) : null,
          items: ocrResult.items,
        }),
        token,
      })
      navigate('/purchases')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Gagal menyimpan. Cuba lagi.')
      }
      setPhase('review')
    }
  }

  function updateField(field: keyof FieldState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label="Kembali">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900">Imbas resit</h1>
        </div>
      </header>

      <div className="p-4">
        {phase === 'upload' && (
          <div className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter') fileRef.current?.click() }}
              className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-sky-400 transition-colors"
            >
              {uploading ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full border-2 border-sky-400 border-t-transparent animate-spin mx-auto" />
                  <p className="text-sm text-gray-500">Mengekstrak maklumat...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-900">Ambil gambar resit</p>
                  <p className="text-xs text-gray-500">atau ketik untuk pilih dari galeri</p>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <button
              onClick={() => navigate('/purchases/new')}
              className="w-full text-sky-600 text-sm font-medium py-2"
            >
              Masuk manual sahaja
            </button>
          </div>
        )}

        {(phase === 'review' || phase === 'saving') && ocrResult && (
          <div className="space-y-4">
            <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3">
              <p className="text-xs text-sky-700 font-medium">Semak dan betulkan maklumat yang diekstrak</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama kedai / pembekal</label>
                <input
                  type="text"
                  value={fields.merchant}
                  onChange={updateField('merchant')}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tarikh</label>
                <input
                  type="date"
                  value={fields.date}
                  onChange={updateField('date')}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah (RM)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={fields.totalAmount}
                  onChange={updateField('totalAmount')}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {ocrResult.items.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-600 mb-3">Item yang diekstrak</p>
                <ul className="space-y-2">
                  {ocrResult.items.map((item, i) => (
                    <li key={i} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{item.description}</p>
                        {item.quantity !== null && item.unit && (
                          <p className="text-xs text-gray-400">{item.quantity} {item.unit}</p>
                        )}
                      </div>
                      {item.totalPrice !== null && (
                        <p className="text-sm text-gray-700 whitespace-nowrap">RM {item.totalPrice.toFixed(2)}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={() => void handleConfirm()}
              disabled={phase === 'saving'}
              className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
            >
              {phase === 'saving' ? 'Menyimpan...' : 'Sahkan dan simpan'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
