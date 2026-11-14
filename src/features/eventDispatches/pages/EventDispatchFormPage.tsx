import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import { useT } from '../../../hooks/useT'
import LoadingSpinner from '../../../components/LoadingSpinner'

type Product = {
  id: string
  name: string
  unit: string
  currentStockUnits: string
}

type ListResponse<T> = { items: T[]; total: number; page: number; pageSize: number }

type ConsignmentItem = {
  productId: string
  productName: string
  unit: string
  quantity: string
}

export default function EventDispatchFormPage() {
  const navigate = useNavigate()
  const { token, refreshToken } = useAuth()
  const t = useT()

  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ConsignmentItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => apiFetch<ListResponse<Product>>('/api/v1/products?pageSize=500', { token }),
    enabled: !!token,
  })

  const products = productsData?.items ?? []
  const usedProductIds = new Set(items.map((i) => i.productId))

  function addProduct(productId: string) {
    const product = products.find((p) => p.id === productId)
    if (!product || usedProductIds.has(productId)) return
    setItems((prev) => [...prev, { productId, productName: product.name, unit: product.unit, quantity: '' }])
  }

  function updateQty(index: number, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, quantity: value } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Consignment name is required.'); return }
    if (items.length === 0) { setError('Add at least one product.'); return }
    const invalidItem = items.find((i) => !i.quantity || parseFloat(i.quantity) <= 0)
    if (invalidItem) { setError(`Enter a valid quantity for ${invalidItem.productName}.`); return }

    setSaving(true)
    try {
      const freshToken = await refreshToken()
      const result = await apiFetch<{ id: string }>('/api/v1/event-dispatches', {
        method: 'POST',
        token: freshToken,
        body: JSON.stringify({
          name: name.trim(),
          eventDate: eventDate || undefined,
          notes: notes.trim() || undefined,
          items: items.map((i) => ({ productId: i.productId, quantity: parseFloat(i.quantity) })),
        }),
      })
      navigate(`/consignments/${result.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('consignment_createError'))
    } finally {
      setSaving(false)
    }
  }

  const itemsSection = (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={item.productId} className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-100 px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
            <p className="text-xs text-gray-400">{item.unit}</p>
          </div>
          <input
            type="number"
            min="0.001"
            step="any"
            value={item.quantity}
            onChange={(e) => updateQty(idx, e.target.value)}
            placeholder="0"
            className="w-24 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
          <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 ml-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      {productsLoading ? (
        <LoadingSpinner />
      ) : (
        <select
          value=""
          onChange={(e) => { if (e.target.value) addProduct(e.target.value) }}
          className="w-full border border-dashed border-brand-400 rounded-lg px-3 py-2 text-sm text-brand-600 bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          <option value="">+ {t('consignment_addProduct')}</option>
          {products
            .filter((p) => !usedProductIds.has(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit}) — stock: {Number(p.currentStockUnits).toFixed(2)}
              </option>
            ))}
        </select>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-50 pb-20 md:pb-6">
      {/* Mobile header */}
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900">{t('consignment_new')}</h1>
        </div>
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('consignment_new')}</h1>
      </header>

      <div className="md:max-w-2xl md:px-8 md:py-6">
        {/* Mobile form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="md:hidden p-4 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('consignment_name')} *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramadan Bazaar 2026"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('consignment_eventDate')}</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('consignment_notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('consignment_notesPlaceholder')}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">{t('consignment_items')}</p>
            {itemsSection}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {saving ? '...' : t('consignment_new')}
          </button>
        </form>

        {/* Desktop card form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-card">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('consignment_name')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('consignment_name')} *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramadan Bazaar 2026"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('consignment_eventDate')}</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('consignment_notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('consignment_notesPlaceholder')}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('consignment_items')}</p>
              {itemsSection}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? '...' : t('consignment_new')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
