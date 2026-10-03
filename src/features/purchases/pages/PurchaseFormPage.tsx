import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'

type FormData = {
  merchant: string
  date: string
  totalAmount: string
  notes: string
}

export default function PurchaseFormPage() {
  const navigate = useNavigate()
  const { token } = useAuth()

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<FormData>({ merchant: '', date: today, totalAmount: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.totalAmount) { setError('Jumlah diperlukan.'); return }
    setSaving(true)
    setError(null)

    try {
      await apiFetch('/api/v1/purchases', {
        method: 'POST',
        body: JSON.stringify({
          merchant: form.merchant.trim() || null,
          date: form.date || null,
          totalAmount: parseFloat(form.totalAmount),
          notes: form.notes.trim() || null,
          items: [],
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
          <h1 className="text-base font-semibold text-gray-900">Tambah pembelian manual</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="merchant">
            Nama kedai / pembekal <span className="text-gray-400">(pilihan)</span>
          </label>
          <input
            id="merchant"
            type="text"
            value={form.merchant}
            onChange={updateField('merchant')}
            placeholder="Cth: Pasar Tani, 99 Speedmart"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="date">
            Tarikh
          </label>
          <input
            id="date"
            type="date"
            value={form.date}
            onChange={updateField('date')}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="amount">
            Jumlah (RM) <span className="text-red-500">*</span>
          </label>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.totalAmount}
            onChange={updateField('totalAmount')}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notes">
            Nota <span className="text-gray-400">(pilihan)</span>
          </label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={updateField('notes')}
            rows={3}
            placeholder="Nota tambahan..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan pembelian'}
        </button>
      </form>
    </div>
  )
}
