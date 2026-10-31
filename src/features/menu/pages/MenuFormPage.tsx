import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { useT } from '../../../hooks/useT'

type Product = { id: string; name: string; unit: string; salePrice: string }
type ComponentLine = { productId: string; name: string; quantity: string; unit: string }

const BackArrow = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

export default function MenuFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [expiryDurationDays, setExpiryDurationDays] = useState('')
  const [components, setComponents] = useState<ComponentLine[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<{ items: Product[] }>('/api/v1/products', { token }),
    enabled: !!token,
  })

  useEffect(() => {
    if (!isEdit || !token) return
    const productMap = new Map((productsData?.items ?? []).map((p) => [p.id, p]))
    void apiFetch<{ id: string; name: string; price: string; components: any[] }>(`/api/v1/menu/${id}`, { token })
      .then((item) => {
        setName(item.name)
        setSku((item as any).sku ?? '')
        setPrice(item.price)
        if ((item as any).expiryDurationDays) setExpiryDurationDays(String((item as any).expiryDurationDays))
        setComponents(item.components.map((c: any) => ({
          productId: c.productId,
          name: productMap.get(c.productId)?.name ?? c.productId,
          quantity: String(parseFloat(c.quantity) || 1),
          unit: productMap.get(c.productId)?.unit ?? '',
        })))
        setLoading(false)
      })
      .catch(() => { setError('Failed to load menu item.'); setLoading(false) })
  }, [id, isEdit, token, productsData])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const products = productsData?.items ?? []
  const filtered = search ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : products

  function addProduct(prod: Product) {
    setComponents((prev) => [...prev, { productId: prod.id, name: prod.name, quantity: '1', unit: prod.unit }])
    setShowPicker(false); setSearch('')
    // Auto-suggest price if not set
    if (!price && prod.salePrice) setPrice(prod.salePrice)
  }

  function typeLabel() {
    if (components.length === 0) return null
    const uniqueProducts = new Set(components.map((c) => c.productId))
    const totalQty = components.reduce((sum, c) => sum + parseFloat(c.quantity || '0'), 0)
    if (uniqueProducts.size === 1 && totalQty === 1) return 'Single item'
    if (uniqueProducts.size === 1) return `Pack (×${totalQty} of same product)`
    return `Set (${uniqueProducts.size} different products)`
  }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    if (!price || parseFloat(price) < 0) { setError('Price is required'); return }
    if (components.length === 0) { setError('Add at least one product'); return }
    const freshToken = await refreshToken()
    if (!freshToken) return
    setSaving(true); setError(null)
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim() || null,
        price: parseFloat(price),
        components: components.map((c) => ({ productId: c.productId, quantity: parseFloat(c.quantity) || 1 })),
        expiryDurationDays: expiryDurationDays !== '' ? parseInt(expiryDurationDays) : null,
      }
      if (isEdit) {
        await apiFetch(`/api/v1/menu/${id}`, { method: 'PUT', body: JSON.stringify(payload), token: freshToken })
      } else {
        await apiFetch('/api/v1/menu', { method: 'POST', body: JSON.stringify(payload), token: freshToken })
      }
      void queryClient.invalidateQueries({ queryKey: ['menu'] })
      navigate('/catalogue')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const label = typeLabel()

  const pickerContent = (
    <>
      <div className="p-3 border-b border-gray-100">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" autoFocus />
      </div>
      <ul className="overflow-y-auto max-h-52">
        {filtered.map((p) => (
          <li key={p.id}>
            <button onClick={() => addProduct(p)} className="w-full px-4 py-2.5 text-left text-sm text-gray-800 border-b border-gray-50 hover:bg-brand-50 hover:text-brand-700 transition-colors">
              {p.name}<span className="text-xs text-gray-400 ml-2">({p.unit})</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="p-4 text-center text-sm text-gray-400">No products found</li>}
      </ul>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500"><BackArrow /></button>
          <h1 className="text-base font-semibold text-gray-900 flex-1">{isEdit ? 'Edit Menu Item' : 'New Menu Item'}</h1>
        </div>
      </header>

      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors"><BackArrow /></button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">{isEdit ? 'Edit Menu Item' : 'New Menu Item'}</h1>
      </header>

      <div className="md:max-w-4xl md:px-8 md:py-6">

        <div className="p-4 md:p-0 space-y-5">
          {/* Name + price */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Menu item name <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Set A Lunch, Box of 12 Cookies"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">SKU <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. CAT-001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Price (RM) <span className="text-red-500">*</span></label>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 8.50"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Expiry duration (days, optional)</label>
              <input type="number" inputMode="numeric" min="1" step="1" value={expiryDurationDays}
                onChange={(e) => setExpiryDurationDays(e.target.value)}
                placeholder="e.g. 3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          {/* Type indicator */}
          {label && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5">
              <p className="text-xs font-medium text-brand-700">Type: {label}</p>
            </div>
          )}

          {/* Products / components */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Products included</p>
            {components.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden divide-y divide-gray-100 mb-3">
                {components.map((comp, idx) => (
                  <div key={idx} className="p-3 flex items-center gap-3">
                    <p className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">{comp.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">×</span>
                      <input type="number" inputMode="decimal" min="0.001" step="any" value={comp.quantity}
                        onChange={(e) => setComponents((prev) => prev.map((c, i) => i === idx ? { ...c, quantity: e.target.value } : c))}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                        aria-label="Qty" />
                      <span className="text-xs text-gray-400">{comp.unit}</span>
                    </div>
                    <button onClick={() => setComponents((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative" ref={pickerRef}>
              <button onClick={() => { setShowPicker((v) => !v); setSearch('') }}
                className="w-full border-2 border-dashed border-brand-300 rounded-xl py-2.5 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-colors">
                + Add product
              </button>
              {showPicker && (
                <div className="hidden md:block absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-card shadow-lg z-30 overflow-hidden">
                  {pickerContent}
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button onClick={() => void handleSave()} disabled={saving}
            className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 hover:bg-brand-600 transition-colors">
            {saving ? t('common_saving') : t('common_save')}
          </button>
        </div>
      </div>

      {showPicker && (
        <div className="md:hidden">
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowPicker(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Pick product</h3>
              <button onClick={() => setShowPicker(false)} className="text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {pickerContent}
          </div>
        </div>
      )}
    </div>
  )
}
