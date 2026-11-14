import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import { useT } from '../../../hooks/useT'
import SearchableSelect from '../../../components/SearchableSelect'

type Product = { id: string; name: string; salePrice: string | null; unit: string; currentStockUnits: string }
type MenuItem = { id: string; name: string; price: string }
type PaginatedResponse<T> = { items: T[]; total: number; page: number; pageSize: number }

type OrderItem = {
  itemType: 'CATALOGUE' | 'PRODUCT'
  menuItemId: string | null
  productId: string | null
  itemName: string
  quantity: string
  catalogPrice: string   // original price from product/menu settings (read-only reference)
  pricePerUnit: string   // actual charged price (editable, can be discounted)
}

type FormData = {
  customerName: string
  customerPhone: string
  customerAddress: string
  notes: string
}

type FulfillmentType = 'STOCK' | 'PRODUCE'
type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE' | 'TRANSFER'

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'TRANSFER', label: 'Transfer' },
]

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

  const [form, setForm] = useState<FormData>({ customerName: '', customerPhone: '', customerAddress: '', notes: '' })
  const [covers, setCovers] = useState<string>('')
  const [fulfillmentDate, setFulfillmentDate] = useState<string>('')
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('STOCK')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [items, setItems] = useState<OrderItem[]>([
    { itemType: 'CATALOGUE', menuItemId: null, productId: null, itemName: '', quantity: '1', catalogPrice: '', pricePerUnit: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [savingMode, setSavingMode] = useState<'draft' | 'confirm'>('draft')
  const savingModeRef = useRef<'draft' | 'confirm'>('draft')
  const [error, setError] = useState<string | null>(null)

  const { data: productsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => apiFetch<{ items: Product[] }>('/api/v1/products?isActive=true&pageSize=500', { token }),
    enabled: !!token,
  })

  const { data: menuData } = useQuery({
    queryKey: ['menu'],
    queryFn: () => apiFetch<PaginatedResponse<MenuItem>>('/api/v1/menu?pageSize=500', { token }),
    enabled: !!token,
  })

  const products = productsData?.items ?? []
  const menuItems = menuData?.items ?? []

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
            ? { ...it, menuItemId: null, productId: null, itemName: '', catalogPrice: '', pricePerUnit: '' }
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
            ? { itemType: 'CATALOGUE', menuItemId, productId: null, itemName: menuItem.name, quantity: it.quantity, catalogPrice: menuItem.price, pricePerUnit: menuItem.price }
            : it,
        ),
      )
    } else if (value.startsWith('prod_')) {
      const productId = value.slice(5)
      const product = products.find((p) => p.id === productId)
      if (!product) return
      const price = product.salePrice ?? ''
      setItems((prev) =>
        prev.map((it, i) =>
          i === idx
            ? { itemType: 'PRODUCT', menuItemId: null, productId, itemName: product.name, quantity: it.quantity, catalogPrice: price, pricePerUnit: price }
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
      { itemType: 'CATALOGUE', menuItemId: null, productId: null, itemName: '', quantity: '1', catalogPrice: '', pricePerUnit: '' },
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

  const lowStockItems = fulfillmentType === 'STOCK'
    ? items.filter(item => {
        if (item.itemType !== 'PRODUCT' || !item.productId) return false
        const product = products.find(p => p.id === item.productId)
        if (!product) return false
        return parseFloat(item.quantity || '0') > parseFloat(product.currentStockUnits)
      })
    : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.every((item) => !item.itemName.trim())) {
      setError(t('orders_errorAtLeastOneItem'))
      return
    }
    const mode = savingModeRef.current
    const freshToken = await refreshToken()
    if (!freshToken) return
    setSaving(true)
    setSavingMode(mode)
    setError(null)

    try {
      const created = await apiFetch<{ id: string }>('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: form.customerName.trim() || undefined,
          customerPhone: form.customerPhone.trim() || undefined,
          customerAddress: form.customerAddress.trim() || undefined,
          notes: form.notes.trim() || undefined,
          channel: 'MANUAL',
          fulfillmentType,
          paymentMethod: paymentMethod ?? undefined,
          covers: covers ? parseInt(covers, 10) : undefined,
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
          fulfillmentDate: fulfillmentDate || undefined,
        }),
        token: freshToken,
      })

      if (mode === 'confirm') {
        await apiFetch(`/api/v1/orders/${created.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'CONFIRMED' }),
          token: freshToken,
        })
      }

      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['orders-counts'] })

      if (fulfillmentType === 'PRODUCE' && mode === 'confirm') {
        navigate(`/productions/new?fromOrderId=${created.id}`)
      } else {
        navigate(`/orders/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('orders_errorSave'))
    } finally {
      setSaving(false)
    }
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const typeToggle = (
    <div className="flex rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setFulfillmentType('STOCK')}
        className={`flex-1 py-3 text-sm font-semibold transition-colors ${fulfillmentType === 'STOCK' ? 'bg-brand-500 text-white' : 'bg-white text-gray-500'}`}
      >
        📦 From Stock
      </button>
      <button
        type="button"
        onClick={() => setFulfillmentType('PRODUCE')}
        className={`flex-1 py-3 text-sm font-semibold transition-colors border-l border-gray-200 ${fulfillmentType === 'PRODUCE' ? 'bg-brand-500 text-white' : 'bg-white text-gray-500'}`}
      >
        🏭 Produce
      </button>
    </div>
  )

  const paymentMethodPicker = (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Payment method <span className="normal-case font-normal text-gray-400">(optional)</span>
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {PAYMENT_METHODS.map((pm) => (
          <button
            key={pm.value}
            type="button"
            onClick={() => setPaymentMethod(paymentMethod === pm.value ? null : pm.value)}
            className={`py-2 text-sm font-medium rounded-lg border transition-colors ${
              paymentMethod === pm.value
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
            }`}
          >
            {pm.label}
          </button>
        ))}
      </div>
    </div>
  )

  const stockWarning = (
    <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 space-y-1">
      <p className="text-sm font-semibold text-orange-700">⚠ Insufficient stock</p>
      {lowStockItems.map(item => (
        <p key={item.productId} className="text-xs text-orange-600">
          {item.itemName}: need {item.quantity}, have {products.find(p => p.id === item.productId)?.currentStockUnits ?? '0'}
        </p>
      ))}
      <button
        type="button"
        onClick={() => setFulfillmentType('PRODUCE')}
        className="text-xs font-semibold text-orange-700 underline mt-1"
      >
        Switch to Produce instead
      </button>
    </div>
  )

  const itemsSection = (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('orders_items')}</p>
      {items.map((item, idx) => {
        const isDiscounted = item.catalogPrice && item.pricePerUnit &&
          parseFloat(item.pricePerUnit) < parseFloat(item.catalogPrice)
        return (
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
              <div className="flex gap-2 items-end">
                {/* Qty */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">Qty</p>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={updateItemField(idx, 'quantity')}
                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    aria-label="Qty"
                  />
                </div>
                {/* Normal price (read-only) */}
                {item.catalogPrice && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Normal price</p>
                    <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 h-[38px]">
                      <span className="text-xs text-gray-400 mr-1">RM</span>
                      <span className="text-sm text-gray-500">{parseFloat(item.catalogPrice).toFixed(2)}</span>
                    </div>
                  </div>
                )}
                {/* Charged price */}
                <div className="flex-1">
                  <p className="text-xs mb-1">
                    <span className={isDiscounted ? 'text-orange-500 font-medium' : 'text-gray-400'}>
                      {isDiscounted ? 'After discount' : 'Price'}
                    </span>
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">RM</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={item.pricePerUnit}
                      onChange={updateItemField(idx, 'pricePerUnit')}
                      placeholder="0.00"
                      className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                        isDiscounted ? 'border-orange-300 bg-orange-50' : 'border-gray-300'
                      }`}
                      aria-label="Price per unit"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
      <button type="button" onClick={addItem} className="text-brand-600 text-sm font-medium hover:text-brand-700">
        + {t('orders_addItem')}
      </button>
    </div>
  )

  return (
    <>
      {/* ── Mobile layout ── */}
      <div className="min-h-screen bg-brand-50 pb-24 md:hidden">
        <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
              <BackArrow />
            </button>
            <h1 className="text-base font-semibold text-gray-900">{t('orders_formAddTitle')}</h1>
          </div>
        </header>

        <form id="order-form-mobile" onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Type</p>
            {typeToggle}
            {fulfillmentType === 'PRODUCE' && (
              <div className="mt-3 rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-purple-700">Production required before delivery</p>
                <p className="text-xs text-purple-600">
                  After saving you'll go straight to plan the production runs for this order.
                </p>
              </div>
            )}
          </div>

          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('orders_customerInfo')}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cust-name-m">
                {t('orders_customerName')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
              </label>
              <input id="cust-name-m" type="text" value={form.customerName} onChange={updateField('customerName')} placeholder={t('orders_customerNamePlaceholder')} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cust-phone-m">
                {t('orders_customerPhone')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
              </label>
              <input id="cust-phone-m" type="tel" value={form.customerPhone} onChange={updateField('customerPhone')} placeholder={t('orders_customerPhonePlaceholder')} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cust-addr-m">
                Delivery address <span className="text-gray-400 font-normal">({t('common_optional')})</span>
              </label>
              <textarea id="cust-addr-m" value={form.customerAddress} onChange={updateField('customerAddress')} rows={2} placeholder="e.g. 12 Jalan Bahagia, Taman Sri..." className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
            {itemsSection}
          </div>

          {/* Stock warning */}
          {lowStockItems.length > 0 && stockWarning}

          {/* Total */}
          {totalAmount > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card px-4 py-3 flex justify-between items-center">
              <p className="text-sm font-semibold text-gray-900">{t('orders_totalAmount')}</p>
              <p className="text-sm font-semibold text-gray-900">RM {totalAmount.toFixed(2)}</p>
            </div>
          )}

          {/* Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-4">
            {paymentMethodPicker}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="fulfillment-m">
                Fulfillment date <span className="text-gray-400 font-normal">(leave blank = immediate)</span>
              </label>
              <input id="fulfillment-m" type="date" min={tomorrowStr} value={fulfillmentDate} onChange={(e) => setFulfillmentDate(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              {fulfillmentDate && <p className="text-xs text-blue-600 mt-1">Scheduled for {fulfillmentDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="order-notes-m">
                {t('orders_notes')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
              </label>
              <textarea id="order-notes-m" value={form.notes} onChange={updateField('notes')} rows={3} placeholder={t('orders_notesPlaceholder')} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="order-covers-m">
                {t('orders_covers')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
              </label>
              <input id="order-covers-m" type="number" inputMode="numeric" min="1" step="1" value={covers} onChange={(e) => setCovers(e.target.value)} placeholder={t('orders_coversPlaceholder')} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </form>

        {/* Fixed bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-3 space-y-2">
          <div className="flex gap-2">
            <button
              type="submit"
              form="order-form-mobile"
              onClick={() => { savingModeRef.current = 'draft' }}
              disabled={saving}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
            >
              {saving && savingMode === 'draft' ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="submit"
              form="order-form-mobile"
              onClick={() => { savingModeRef.current = 'confirm' }}
              disabled={saving}
              className="flex-1 bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
            >
              {saving && savingMode === 'confirm'
                ? 'Confirming...'
                : fulfillmentType === 'PRODUCE'
                  ? 'Confirm & Plan Production'
                  : 'Save & Confirm'}
            </button>
          </div>
          <p className="text-xs text-center text-gray-400">
            Draft = saved but not yet confirmed · Confirm = ready to process
          </p>
        </div>
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden md:block min-h-screen bg-brand-50">
        <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label={t('common_back')}>
            <BackArrow />
          </button>
          <h1 className="text-base font-semibold text-gray-900 flex-1">{t('orders_formAddTitle')}</h1>
        </header>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex gap-6 items-start">
            {/* Left: customer + items */}
            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('orders_customerInfo')}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="cust-name-d">
                      {t('orders_customerName')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
                    </label>
                    <input id="cust-name-d" type="text" value={form.customerName} onChange={updateField('customerName')} placeholder={t('orders_customerNamePlaceholder')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="cust-phone-d">
                      {t('orders_customerPhone')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
                    </label>
                    <input id="cust-phone-d" type="tel" value={form.customerPhone} onChange={updateField('customerPhone')} placeholder={t('orders_customerPhonePlaceholder')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="cust-addr-d">
                      Delivery address <span className="text-gray-400 font-normal">({t('common_optional')})</span>
                    </label>
                    <textarea id="cust-addr-d" value={form.customerAddress} onChange={updateField('customerAddress')} rows={2} placeholder="e.g. 12 Jalan Bahagia, Taman Sri..." className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6">
                {itemsSection}
                {lowStockItems.length > 0 && <div className="mt-4">{stockWarning}</div>}
                {totalAmount > 0 && (
                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{t('orders_totalAmount')}</p>
                    <p className="text-sm font-semibold text-gray-900">RM {totalAmount.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: type + details + submit */}
            <div className="w-72 space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Type</p>
                {typeToggle}
                {fulfillmentType === 'PRODUCE' && (
                  <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 space-y-1">
                    <p className="text-sm font-semibold text-purple-700">Production required</p>
                    <p className="text-xs text-purple-600">
                      After saving you'll go straight to plan the production runs.
                    </p>
                  </div>
                )}

                {paymentMethodPicker}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="fulfillment-d">
                    Fulfillment date <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input id="fulfillment-d" type="date" min={tomorrowStr} value={fulfillmentDate} onChange={(e) => setFulfillmentDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  {fulfillmentDate && <p className="text-xs text-blue-600 mt-1">Scheduled for {fulfillmentDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="order-notes-d">
                    {t('orders_notes')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
                  </label>
                  <textarea id="order-notes-d" value={form.notes} onChange={updateField('notes')} rows={3} placeholder={t('orders_notesPlaceholder')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="order-covers-d">
                    {t('orders_covers')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
                  </label>
                  <input id="order-covers-d" type="number" inputMode="numeric" min="1" step="1" value={covers} onChange={(e) => setCovers(e.target.value)} placeholder={t('orders_coversPlaceholder')} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="space-y-2">
                  <button
                    type="submit"
                    onClick={() => { savingModeRef.current = 'confirm' }}
                    disabled={saving}
                    className="w-full bg-brand-500 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-brand-600 transition-colors disabled:opacity-60"
                  >
                    {saving && savingMode === 'confirm'
                      ? 'Confirming...'
                      : fulfillmentType === 'PRODUCE'
                        ? 'Confirm & Plan Production'
                        : 'Save & Confirm'}
                  </button>
                  <button
                    type="submit"
                    onClick={() => { savingModeRef.current = 'draft' }}
                    disabled={saving}
                    className="w-full border border-gray-200 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    {saving && savingMode === 'draft' ? 'Saving...' : 'Save as Draft'}
                  </button>
                  <p className="text-xs text-center text-gray-400">
                    Draft = saved, not yet confirmed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
