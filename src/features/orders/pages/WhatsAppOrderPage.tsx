import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'

type ParsedItem = {
  description: string
  quantity: number
  unitPrice: number | null
}

type ParsedOrder = {
  customerName: string | null
  customerPhone: string | null
  deliveryDate: string | null
  notes: string | null
  items: ParsedItem[]
  totalAmount: number | null
}

export default function WhatsAppOrderPage() {
  const navigate = useNavigate()
  const { token } = useAuth()

  const [message, setMessage] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleParse() {
    if (!message.trim()) { setError('Tampal mesej pesanan terlebih dahulu.'); return }
    setParsing(true)
    setError(null)
    try {
      const result = await apiFetch<ParsedOrder>('/api/v1/orders/parse-whatsapp', {
        method: 'POST',
        body: JSON.stringify({ message }),
        token,
      })
      setParsed(result)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Gagal mengurai mesej. Cuba lagi.')
      }
    } finally {
      setParsing(false)
    }
  }

  async function handleConfirm() {
    if (!parsed) return
    setSaving(true)
    setError(null)
    try {
      const created = await apiFetch<{ id: string }>('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({ ...parsed, source: 'whatsapp' }),
        token,
      })
      navigate(`/orders/${created.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Gagal menyimpan pesanan. Cuba lagi.')
      }
    } finally {
      setSaving(false)
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
          <h1 className="text-base font-semibold text-gray-900" data-tour="order-whatsapp">
            Import dari WhatsApp
          </h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {!parsed ? (
          <>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800">
              Tampal mesej pesanan dari WhatsApp. Kami akan urai nama, item, dan harga secara automatik.
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Tampal mesej WhatsApp di sini..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={() => void handleParse()}
              disabled={parsing || !message.trim()}
              className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
            >
              {parsing ? 'Mengurai...' : 'Urai mesej'}
            </button>
          </>
        ) : (
          <>
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
              <p className="text-xs text-green-700 font-medium">Semak maklumat yang diurai</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Nama pelanggan</p>
                  <p className="font-medium text-gray-900">{parsed.customerName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">No. telefon</p>
                  <p className="font-medium text-gray-900">{parsed.customerPhone ?? '—'}</p>
                </div>
                {parsed.deliveryDate && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Tarikh penghantaran</p>
                    <p className="font-medium text-gray-900">{parsed.deliveryDate}</p>
                  </div>
                )}
              </div>
            </div>

            {parsed.items.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-600 mb-3">Item pesanan</p>
                <ul className="space-y-2">
                  {parsed.items.map((item, i) => (
                    <li key={i} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800">{item.description}</p>
                        <p className="text-xs text-gray-400">x{item.quantity}</p>
                      </div>
                      {item.unitPrice !== null && (
                        <p className="text-sm text-gray-700 whitespace-nowrap">
                          RM {(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {parsed.totalAmount !== null && (
                  <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
                    <p className="text-sm font-semibold text-gray-900">Jumlah</p>
                    <p className="text-sm font-semibold text-gray-900">RM {parsed.totalAmount.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}

            {parsed.notes && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">Nota</p>
                <p className="text-sm text-gray-700">{parsed.notes}</p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setParsed(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-3 rounded-xl text-sm"
              >
                Kembali
              </button>
              <button
                onClick={() => void handleConfirm()}
                disabled={saving}
                className="flex-1 bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan pesanan'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
