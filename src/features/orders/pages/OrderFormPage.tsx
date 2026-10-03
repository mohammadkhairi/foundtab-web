import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'

type OrderItem = {
  description: string
  quantity: string
  unitPrice: string
}

type FormData = {
  customerName: string
  customerPhone: string
  deliveryDate: string
  notes: string
}

export default function OrderFormPage() {
  const navigate = useNavigate()
  const { token } = useAuth()

  const [form, setForm] = useState<FormData>({ customerName: '', customerPhone: '', deliveryDate: '', notes: '' })
  const [items, setItems] = useState<OrderItem[]>([{ description: '', quantity: '1', unitPrice: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  function updateItem(idx: number, field: keyof OrderItem) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: e.target.value } : item)))
    }
  }

  function addItem() {
    setItems((prev) => [...prev, { description: '', quantity: '1', unitPrice: '' }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const totalAmount = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unitPrice) || 0
    return sum + qty * price
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.every((item) => !item.description.trim())) {
      setError('Tambah sekurang-kurangnya satu item pesanan.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const created = await apiFetch<{ id: string }>('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: form.customerName.trim() || null,
          customerPhone: form.customerPhone.trim() || null,
          deliveryDate: form.deliveryDate || null,
          notes: form.notes.trim() || null,
          source: 'manual',
          items: items
            .filter((i) => i.description.trim())
            .map((i) => ({
              description: i.description.trim(),
              quantity: parseFloat(i.quantity) || 1,
              unitPrice: i.unitPrice !== '' ? parseFloat(i.unitPrice) : null,
            })),
          totalAmount: totalAmount > 0 ? totalAmount : null,
        }),
        token,
      })
      navigate(`/orders/${created.id}`)
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
          <h1 className="text-base font-semibold text-gray-900">Tambah pesanan manual</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Maklumat pelanggan</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cust-name">
              Nama pelanggan <span className="text-gray-400">(pilihan)</span>
            </label>
            <input
              id="cust-name"
              type="text"
              value={form.customerName}
              onChange={updateField('customerName')}
              placeholder="Cth: Mak Su"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cust-phone">
              No. telefon <span className="text-gray-400">(pilihan)</span>
            </label>
            <input
              id="cust-phone"
              type="tel"
              value={form.customerPhone}
              onChange={updateField('customerPhone')}
              placeholder="Cth: 0123456789"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="delivery-date">
              Tarikh penghantaran <span className="text-gray-400">(pilihan)</span>
            </label>
            <input
              id="delivery-date"
              type="date"
              value={form.deliveryDate}
              onChange={updateField('deliveryDate')}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Item pesanan</p>
          {items.map((item, idx) => (
            <div key={idx} className="space-y-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.description}
                  onChange={updateItem(idx, 'description')}
                  placeholder={`Item ${idx + 1}`}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-gray-300 hover:text-red-400"
                    aria-label="Buang item"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={updateItem(idx, 'quantity')}
                  className="w-20 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  aria-label="Kuantiti"
                />
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">RM</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={updateItem(idx, 'unitPrice')}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Harga seunit"
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="text-sky-600 text-sm font-medium"
          >
            + Tambah item
          </button>
        </div>

        {totalAmount > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex justify-between items-center">
            <p className="text-sm font-semibold text-gray-900">Jumlah</p>
            <p className="text-sm font-semibold text-gray-900">RM {totalAmount.toFixed(2)}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="order-notes">
            Nota <span className="text-gray-400">(pilihan)</span>
          </label>
          <textarea
            id="order-notes"
            value={form.notes}
            onChange={updateField('notes')}
            rows={3}
            placeholder="Arahan khas, alergi, permintaan pelanggan..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan pesanan'}
        </button>
      </form>
    </div>
  )
}
