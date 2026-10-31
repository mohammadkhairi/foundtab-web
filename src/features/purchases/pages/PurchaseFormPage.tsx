import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import { useT } from '../../../hooks/useT'

type LineItem = {
  rawMaterialName: string
  quantity: string
  purchaseUnit: string
  pricePerUnit: string
}

type FormData = {
  supplierName: string
  receiptDate: string
  totalAmount: string
  notes: string
}

export default function PurchaseFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { refreshToken } = useAuth()
  const t = useT()

  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<FormData>({ supplierName: '', receiptDate: today, totalAmount: '', notes: '' })
  const [items, setItems] = useState<LineItem[]>([{ rawMaterialName: '', quantity: '', purchaseUnit: 'kg', pricePerUnit: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  function updateItem(idx: number, field: keyof LineItem) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: e.target.value } : it))
    }
  }

  function addItem() {
    setItems((prev) => [...prev, { rawMaterialName: '', quantity: '', purchaseUnit: 'kg', pricePerUnit: '' }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const filledItems = items.filter((it) => it.rawMaterialName.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.totalAmount) { setError(t('purchases_totalRequired')); return }
    const freshToken = await refreshToken()
    if (!freshToken) return
    setSaving(true)
    setError(null)

    try {
      await apiFetch('/api/v1/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierName: form.supplierName.trim() || undefined,
          receiptDate: form.receiptDate || undefined,
          totalAmount: parseFloat(form.totalAmount),
          notes: form.notes.trim() || undefined,
          items: filledItems.map((it) => ({
            rawMaterialName: it.rawMaterialName.trim(),
            quantity: parseFloat(it.quantity) || 0,
            purchaseUnit: it.purchaseUnit.trim() || 'unit',
            pricePerUnit: it.pricePerUnit !== '' ? parseFloat(it.pricePerUnit) : undefined,
          })),
        }),
        token: freshToken,
      })
      void queryClient.invalidateQueries({ queryKey: ['purchases'] })
      navigate('/purchases')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('purchases_saveError'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900">{t('purchases_formAddTitle')}</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="supplier">
            {t('purchases_supplier')} <span className="text-gray-400">({t('common_optional')})</span>
          </label>
          <input
            id="supplier"
            type="text"
            value={form.supplierName}
            onChange={updateField('supplierName')}
            placeholder={t('purchases_supplierPlaceholder')}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="receipt-date">
            {t('purchases_date')}
          </label>
          <input
            id="receipt-date"
            type="date"
            value={form.receiptDate}
            onChange={updateField('receiptDate')}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="amount">
            {t('purchases_totalAmount')} (RM) <span className="text-red-500">*</span>
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

        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('purchases_items')} <span className="text-gray-400 normal-case font-normal">({t('common_optional')})</span></p>
          {items.map((item, idx) => (
            <div key={idx} className="space-y-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.rawMaterialName}
                  onChange={updateItem(idx, 'rawMaterialName')}
                  placeholder={t('purchases_itemNamePlaceholder')}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400">
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
                  min="0"
                  step="any"
                  value={item.quantity}
                  onChange={updateItem(idx, 'quantity')}
                  placeholder={t('purchases_quantity')}
                  className="w-20 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <input
                  type="text"
                  value={item.purchaseUnit}
                  onChange={updateItem(idx, 'purchaseUnit')}
                  placeholder="kg"
                  className="w-16 border border-gray-300 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">RM</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={item.pricePerUnit}
                    onChange={updateItem(idx, 'pricePerUnit')}
                    placeholder={t('purchases_unitPrice')}
                    className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addItem} className="text-sky-600 text-sm font-medium">
            + {t('purchases_addItem')}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notes">
            {t('purchases_notes')} <span className="text-gray-400">({t('common_optional')})</span>
          </label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={updateField('notes')}
            rows={3}
            placeholder={t('purchases_notesPlaceholder')}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
        >
          {saving ? t('common_saving') : t('common_save')}
        </button>
      </form>
    </div>
  )
}
