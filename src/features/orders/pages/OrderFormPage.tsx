import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import { useT } from '../../../hooks/useT'
import SearchableSelect from '../../../components/SearchableSelect'

type Product = { id: string; name: string; salePrice: string | null }
type MenuItem = { id: string; name: string; price: string }

type OrderItem = {
  itemType: 'CATALOGUE' | 'PRODUCT'
  menuItemId: string | null
  productId: string | null
  itemName: string
  quantity: string
  pricePerUnit: string
}

type FormData = {
  customerName: string
  customerPhone: string
  notes: string
}

const BackArrow = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

export default function OrderFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { token, refreshToken } = useAuth()
  const t = useT()

  const [form, setForm] = useState<FormData>({ customerName: '', customerPhone: '', notes: '' })
  const [items, setItems] = useState<OrderItem[]>([
    { itemType: 'CATALOGUE', menuItemId: null, productId: null, itemName: '', quantity: '1', pricePerUnit: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: productsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => apiFetch<{ items: Product[] }>('/api/v1/products?isActive=true&pageSize=500', { token }),
    enabled: !!token,
  })

  const { data: menuData } = useQuery({
    queryKey: ['menu'],
    queryFn: () => apiFetch<MenuItem[]>('/api/v1/menu', { token }),
    enabled: !!token,
  })

  const products = productsData?.items ?? []
  const menuItems = menuData ?? []

  const itemOptions = [
    ...menuItems.map((m) => ({ id: `cat_${m.id}`, label: m.name, sublabel: 'Catalogue' })),
    ...products.map((p) => ({ id: `prod_${p.id}`, label: p.name, sublabel: 'Product' })),
  ]

  const UPPERCASE_FIELDS: (keyof FormData)[] = ['customerName']

  function updateField(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = UPPERCASE_FIELDS.includes(field) ? e.target.value.toUpperCase() : e.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }
  }

  function selectItem(idx: number, value: string) {
    if (!value) {
      setItems((prev) =>
        prev.map((it, i) =>
          i === idx
            ? { ...it, menuItemId: null, productId: null, itemName: '', pricePerUnit: '' }
            : it,
        ),
      )
      return
    }

    if (value.startsWith('cat_')) {
      const menuItemId = value.slice(4)
      const menuItem = menuItems.find((m) => m.id === menuItemId)
      if (!menuItem) return
      setItems((prev) =>
        prev.map((it, i) =>
          i === idx
            ? { itemType: 'CATALOGUE', menuItemId, productId: null, itemName: menuItem.name, quantity: it.quantity, pricePerUnit: menuItem.price }
            : it,
        ),
      )
    } else if (value.startsWith('prod_')) {
      const productId = value.slice(5)
      const product = products.find((p) => p.id === productId)
      if (!product) return
      setItems((prev) =>
        prev.map((it, i) =>
          i === idx
            ? { itemType: 'PRODUCT', menuItemId: null, productId, itemName: product.name, quantity: it.quantity, pricePerUnit: product.salePrice ?? '' }
            : it,
        ),
      )
    }
  }

  function getSelectValue(item: OrderItem): string {
    if (item.itemType === 'CATALOGUE' && item.menuItemId) return `cat_${item.menuItemId}`
    if (item.itemType === 'PRODUCT' && item.productId) return `prod_${item.productId}`
    return ''
  }

  function updateItemField(idx: number, field: 'quantity' | 'pricePerUnit') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: e.target.value } : item)))
    }
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { itemType: 'CATALOGUE', menuItemId: null, productId: null, itemName: '', quantity: '1', pricePerUnit: '' },
    ])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const totalAmount = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.pricePerUnit) || 0
    return sum + qty * price
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.every((item) => !item.itemName.trim())) {
      setError(t('orders_errorAtLeastOneItem'))
      return
    }
    const freshToken = await refreshToken()
    if (!freshToken) return
    setSaving(true)
    setError(null)

    try {
      const created = await apiFetch<{ id: string }>('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: form.customerName.trim() || undefined,
          customerPhone: form.customerPhone.trim() || undefined,
          notes: form.notes.trim() || undefined,
          channel: 'MANUAL',
          items: items
            .filter((i) => i.itemName.trim())
            .map((i) => {
              const qty = parseFloat(i.quantity) || 1
              const price = parseFloat(i.pricePerUnit) || 0
              return {
                itemType: i.itemType,
                menuItemId: i.menuItemId ?? undefined,
                productId: i.productId ?? undefined,
                itemName: i.itemName.trim(),
                quantity: qty,
                pricePerUnit: price,
                totalPrice: qty * price,
              }
            }),
          totalAmount: totalAmount > 0 ? totalAmount : undefined,
        }),
        token: freshToken,
      })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['orders-counts'] })
      navigate(`/orders/${created.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('orders_errorSave'))
    } finally {
      setSaving(false)
    }
  }

  const itemsSection = (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('orders_items')}</p>
      {items.map((item, idx) => (
        <div key={idx} className="space-y-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
          <div className="flex items-center gap-2">
            <SearchableSelect
              className="flex-1"
              options={itemOptions}
              value={getSelectValue(item)}
              onChange={(id) => selectItem(idx, id)}
              placeholder="Select product or catalogue…"
            />
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400" aria-label={t('orders_removeItem')}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {item.itemName ? (
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                value={item.quantity}
                onChange={updateItemField(idx, 'quantity')}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-label="Qty"
              />
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">RM</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={item.pricePerUnit}
                  onChange={updateItemField(idx, 'pricePerUnit')}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  aria-label="Price per unit"
                />
              </div>
            </div>
          ) : null}
        </div>
      ))}
      <button type="button" onClick={addItem} className="text-sky-600 text-sm font-medium hover:text-sky-700">
        + {t('orders_addItem')}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
            <BackArrow />
          </button>
          <h1 className="text-base font-semibold text-gray-900">{t('orders_formAddTitle')}</h1>
        </div>
      </header>

      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label={t('common_back')}>
          <BackArrow />
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('orders_formAddTitle')}</h1>
      </header>

      <div className="md:max-w-4xl md:px-8 md:py-6">

        {/* Mobile form */}
        <form onSubmit={handleSubmit} className="md:hidden p-4 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('orders_customerInfo')}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cust-name-m">
                {t('orders_customerName')} <span className="text-gray-400">({t('common_optional')})</span>
              </label>
              <input id="cust-name-m" type="text" value={form.customerName} onChange={updateField('customerName')} placeholder={t('orders_customerNamePlaceholder')} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cust-phone-m">
                {t('orders_customerPhone')} <span className="text-gray-400">({t('common_optional')})</span>
              </label>
              <input id="cust-phone-m" type="tel" value={form.customerPhone} onChange={updateField('customerPhone')} placeholder={t('orders_customerPhonePlaceholder')} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
            {itemsSection}
          </div>

          {totalAmount > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card px-4 py-3 flex justify-between items-center">
              <p className="text-sm font-semibold text-gray-900">{t('orders_totalAmount')}</p>
              <p className="text-sm font-semibold text-gray-900">RM {totalAmount.toFixed(2)}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="order-notes-m">
              {t('orders_notes')} <span className="text-gray-400">({t('common_optional')})</span>
            </label>
            <textarea id="order-notes-m" value={form.notes} onChange={updateField('notes')} rows={3} placeholder={t('orders_notesPlaceholder')} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving} className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
            {saving ? t('common_saving') : t('common_save')}
          </button>
        </form>

        {/* Desktop card form */}
        <form onSubmit={handleSubmit} className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-card">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('orders_customerInfo')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="cust-name-d">
                    {t('orders_customerName')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
                  </label>
                  <input id="cust-name-d" type="text" value={form.customerName} onChange={updateField('customerName')} placeholder={t('orders_customerNamePlaceholder')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="cust-phone-d">
                    {t('orders_customerPhone')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
                  </label>
                  <input id="cust-phone-d" type="tel" value={form.customerPhone} onChange={updateField('customerPhone')} placeholder={t('orders_customerPhonePlaceholder')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {itemsSection}

            {totalAmount > 0 && (
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{t('orders_totalAmount')}</p>
                <p className="text-sm font-semibold text-gray-900">RM {totalAmount.toFixed(2)}</p>
              </div>
            )}

            <hr className="border-gray-100" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="order-notes-d">
                {t('orders_notes')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
              </label>
              <textarea id="order-notes-d" value={form.notes} onChange={updateField('notes')} rows={3} placeholder={t('orders_notesPlaceholder')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button type="submit" disabled={saving} className="bg-sky-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-sky-600 transition-colors disabled:opacity-60">
              {saving ? t('common_saving') : t('common_save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
