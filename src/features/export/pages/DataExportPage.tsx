import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import { env } from '../../../config/env'

type ExportType = 'purchases' | 'stock-movements' | 'orders' | 'productions'

type ExportOption = {
  type: ExportType
  label: string
  description: string
}

const EXPORT_OPTIONS: ExportOption[] = [
  { type: 'purchases', label: 'Pembelian', description: 'Semua rekod pembelian dalam tempoh yang dipilih.' },
  { type: 'stock-movements', label: 'Pergerakan stok', description: 'Log masuk/keluar semua bahan mentah.' },
  { type: 'orders', label: 'Pesanan', description: 'Senarai pesanan pelanggan dan statusnya.' },
  { type: 'productions', label: 'Pengeluaran', description: 'Rekod pengeluaran produk siap.' },
]

type DateRange = {
  from: string
  to: string
}

function getCurrentMonthRange(): DateRange {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  return { from, to }
}

export default function DataExportPage() {
  const navigate = useNavigate()
  const { token } = useAuth()

  const [selected, setSelected] = useState<ExportType>('purchases')
  const [range, setRange] = useState<DateRange>(getCurrentMonthRange())
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      // Backend returns a signed download URL
      const result = await apiFetch<{ url: string }>(
        `/api/v1/export?type=${selected}&from=${range.from}&to=${range.to}`,
        { token },
      )
      // Trigger browser download
      const a = document.createElement('a')
      a.href = result.url.startsWith('http') ? result.url : `${env.VITE_API_URL}${result.url}`
      a.download = `foundtab-${selected}-${range.from}-${range.to}.csv`
      a.click()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Gagal mengeksport. Cuba lagi.')
      }
    } finally {
      setExporting(false)
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
          <h1 className="text-base font-semibold text-gray-900">Eksport data</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Jenis data</p>
          {EXPORT_OPTIONS.map((opt) => (
            <label key={opt.type} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="export-type"
                value={opt.type}
                checked={selected === opt.type}
                onChange={() => setSelected(opt.type)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tempoh</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="from-date">Dari</label>
              <input
                id="from-date"
                type="date"
                value={range.from}
                onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="to-date">Hingga</label>
              <input
                id="to-date"
                type="date"
                value={range.to}
                onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <button
          onClick={() => void handleExport()}
          disabled={exporting || !range.from || !range.to}
          className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exporting ? 'Menjana fail...' : 'Muat turun CSV'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Data dieksport dalam format CSV. Buka dengan Excel atau Google Sheets.
        </p>
      </div>
    </div>
  )
}
