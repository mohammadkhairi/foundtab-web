import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import { useT } from '../../../hooks/useT'

type Product = {
  id: string
  name: string
  unit: string
  currentStockUnits: string
}

type RawMaterial = {
  id: string
  name: string
  baseUnit: string
  currentStockBaseUnit: string
}

type ListResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

type Props = {
  preselectedProduct?: { id: string; name: string; unit: string } | null
  onClose: () => void
  onSuccess: () => void
}

const WASTAGE_REASONS = ['EXPIRED', 'DAMAGED', 'OTHER'] as const
type WastageReason = (typeof WASTAGE_REASONS)[number]

export default function RecordWastageModal({ preselectedProduct, onClose, onSuccess }: Props) {
  const { token, refreshToken } = useAuth()
  const t = useT()

  const [entityType, setEntityType] = useState<'PRODUCT' | 'RAW_MATERIAL'>(
    preselectedProduct ? 'PRODUCT' : 'PRODUCT',
  )
  const [selectedProductId, setSelectedProductId] = useState(preselectedProduct?.id ?? '')
  const [selectedMaterialId, setSelectedMaterialId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState<WastageReason>('EXPIRED')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: productsData } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => apiFetch<ListResponse<Product>>('/api/v1/products?pageSize=200', { token }),
    enabled: !!token && entityType === 'PRODUCT' && !preselectedProduct,
  })

  const { data: materialsData } = useQuery({
    queryKey: ['raw-materials-all'],
    queryFn: () => apiFetch<ListResponse<RawMaterial>>('/api/v1/raw-materials?pageSize=200', { token }),
    enabled: !!token && entityType === 'RAW_MATERIAL',
  })

  const selectedProduct = preselectedProduct
    ? preselectedProduct
    : productsData?.items.find((p) => p.id === selectedProductId)

  const selectedMaterial = materialsData?.items.find((m) => m.id === selectedMaterialId)

  const unit = entityType === 'PRODUCT'
    ? (selectedProduct?.unit ?? '')
    : (selectedMaterial?.baseUnit ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const entityId = entityType === 'PRODUCT' ? selectedProductId : selectedMaterialId
    if (!entityId) { setError('Please select an item.'); return }
    if (!quantity || parseFloat(quantity) <= 0) { setError('Quantity must be greater than 0.'); return }

    const freshToken = await refreshToken()
    if (!freshToken) return

    setSaving(true)
    setError(null)

    try {
      await apiFetch('/api/v1/wastage', {
        method: 'POST',
        body: JSON.stringify({
          entityType,
          entityId,
          quantity: parseFloat(quantity),
          unit: unit || 'pcs',
          reason,
          notes: notes.trim() || null,
        }),
        token: freshToken,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('wastage_recordError'))
    } finally {
      setSaving(false)
    }
  }

  function reasonLabel(r: WastageReason): string {
    if (r === 'EXPIRED') return t('wastage_reason_EXPIRED')
    if (r === 'DAMAGED') return t('wastage_reason_DAMAGED')
    return t('wastage_reason_OTHER')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{t('wastage_recordWastage')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          {/* Entity type — only shown when no preselected product */}
          {!preselectedProduct && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('wastage_itemType')}</label>
              <div className="flex gap-2">
                {(['PRODUCT', 'RAW_MATERIAL'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setEntityType(type)
                      setSelectedProductId('')
                      setSelectedMaterialId('')
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      entityType === type
                        ? 'bg-sky-50 border-sky-500 text-sky-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {type === 'PRODUCT' ? t('wastage_entity_PRODUCT') : t('wastage_entity_RAW_MATERIAL')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Item select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('wastage_item')}</label>
            {preselectedProduct ? (
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-700">
                {preselectedProduct.name}
              </div>
            ) : entityType === 'PRODUCT' ? (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="">{t('wastage_selectProduct')}</option>
                {productsData?.items.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="">{t('wastage_selectMaterial')}</option>
                {materialsData?.items.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('wastage_quantity')}</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0.001"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {unit && (
                <div className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-500 bg-gray-50 min-w-[60px] text-center">
                  {unit}
                </div>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('wastage_reason')}</label>
            <div className="space-y-2">
              {WASTAGE_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="text-sky-500 focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700">{reasonLabel(r)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('wastage_notes')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('wastage_notesPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm hover:bg-sky-600 transition-colors disabled:opacity-60"
          >
            {saving ? t('common_saving') : t('wastage_recordWastage')}
          </button>
        </form>
      </div>
    </div>
  )
}
