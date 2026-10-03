import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'

type Product = {
  id: string
  name: string
  finishedGoodsUnit: string
}

type SufficiencyCheck = {
  sufficient: boolean
  shortfalls: Array<{ materialName: string; required: number; available: number; unit: string }>
}

export default function ProductionFormPage() {
  const navigate = useNavigate()
  const { token } = useAuth()

  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sufficiency, setSufficiency] = useState<SufficiencyCheck | null>(null)
  const [checking, setChecking] = useState(false)

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<{ items: Product[] }>('/api/v1/products', { token }),
    enabled: !!token,
  })

  const products = productsData?.items ?? []
  const selected = products.find((p) => p.id === productId)

  async function checkSufficiency() {
    if (!productId || !quantity) return
    setChecking(true)
    setSufficiency(null)
    try {
      const result = await apiFetch<SufficiencyCheck>(`/api/v1/products/${productId}/sufficiency?quantity=${quantity}`, { token })
      setSufficiency(result)
    } catch {
      // Non-critical — proceed anyway
    } finally {
      setChecking(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId) { setError('Pilih produk.'); return }
    if (!quantity || parseFloat(quantity) <= 0) { setError('Kuantiti mesti lebih dari 0.'); return }
    setSaving(true)
    setError(null)

    try {
      await apiFetch('/api/v1/productions', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          quantity: parseFloat(quantity),
          notes: notes.trim() || null,
        }),
        token,
      })
      navigate('/productions')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Gagal merekod pengeluaran. Cuba lagi.')
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
          <h1 className="text-base font-semibold text-gray-900" data-tour="production-log">
            Log pengeluaran
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prod-select">
            Produk <span className="text-red-500">*</span>
          </label>
          {productsLoading ? (
            <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <select
              id="prod-select"
              value={productId}
              onChange={(e) => { setProductId(e.target.value); setSufficiency(null) }}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="">-- Pilih produk --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="qty">
            Kuantiti {selected ? `(${selected.finishedGoodsUnit})` : ''} <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              id="qty"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="any"
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setSufficiency(null) }}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={() => void checkSufficiency()}
              disabled={!productId || checking}
              className="px-3 py-2 text-xs text-sky-600 font-medium border border-sky-300 rounded-xl disabled:opacity-40"
            >
              {checking ? '...' : 'Semak stok'}
            </button>
          </div>
        </div>

        {sufficiency !== null && (
          <div className={`rounded-2xl p-4 text-sm ${sufficiency.sufficient ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            {sufficiency.sufficient ? (
              <p className="text-green-700 font-medium">Stok mencukupi untuk pengeluaran ini.</p>
            ) : (
              <div>
                <p className="text-amber-700 font-medium mb-2">Stok tidak mencukupi untuk bahan berikut:</p>
                <ul className="space-y-1">
                  {sufficiency.shortfalls.map((s) => (
                    <li key={s.materialName} className="text-amber-700 text-xs">
                      {s.materialName}: perlu {s.required} {s.unit}, ada {s.available} {s.unit}
                    </li>
                  ))}
                </ul>
                <p className="text-amber-600 text-xs mt-2">Anda masih boleh rekod pengeluaran ini.</p>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prod-notes">
            Nota <span className="text-gray-400">(pilihan)</span>
          </label>
          <textarea
            id="prod-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Cth: Batch pagi, guna resepi standard"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
        >
          {saving ? 'Merekod...' : 'Rekod pengeluaran'}
        </button>
      </form>
    </div>
  )
}
