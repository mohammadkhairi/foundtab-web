import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorState from '../../../components/ErrorState'
import ArchiveDialog from '../../../components/ArchiveDialog'
import { useT } from '../../../hooks/useT'
import { useFormatDate } from '../../../hooks/useFormatDate'

type PurchaseItem = {
  id: string
  rawMaterialName: string
  quantity: string
  purchaseUnit: string
  pricePerUnit: string | null
  totalPrice: string | null
}

type Purchase = {
  id: string
  supplierName: string | null
  receiptDate: string | null
  status: string
  totalAmount: string | null
  notes: string | null
  items: PurchaseItem[]
  createdAt: string
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700',
  OCR_DRAFT: 'bg-amber-100 text-amber-700',
  SUBMITTED: 'bg-emerald-100 text-emerald-700',
}

export default function PurchaseDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const { formatDate: _formatDate } = useFormatDate()
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return _formatDate(dateStr)
  }
  const queryClient = useQueryClient()
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: purchase, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => apiFetch<Purchase>(`/api/v1/purchases/${id}`, { token }),
    enabled: !!token && !!id,
  })

  async function handleSubmit() {
    const freshToken = await refreshToken()
    if (!freshToken) return
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch(`/api/v1/purchases/${id}/submit`, { method: 'POST', token: freshToken })
      void queryClient.invalidateQueries({ queryKey: ['purchase', id] })
      void queryClient.invalidateQueries({ queryKey: ['purchases'] })
      void queryClient.invalidateQueries({ queryKey: ['rawMaterials'] })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common_errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteConfirm() {
    const freshToken = await refreshToken()
    if (!freshToken) return
    setDeleting(true)
    try {
      await apiFetch(`/api/v1/purchases/${id}`, { method: 'DELETE', token: freshToken })
      void queryClient.invalidateQueries({ queryKey: ['purchases'] })
      navigate('/purchases')
    } catch {
      setError(t('common_errorGeneric'))
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (isError || !purchase) return <ErrorState onRetry={() => void refetch()} />

  const isDraft = purchase.status === 'DRAFT' || purchase.status === 'OCR_DRAFT'

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Mobile header */}
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900 flex-1">{t('purchases_detailTitle')}</h1>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[purchase.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {purchase.status === 'SUBMITTED' ? t('purchases_statusSubmitted') : t('purchases_statusDraft')}
          </span>
        </div>
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label={t('common_back')}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('purchases_detailTitle')}</h1>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_STYLE[purchase.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {purchase.status === 'SUBMITTED' ? t('purchases_statusSubmitted') : t('purchases_statusDraft')}
        </span>
      </header>

      <div className="md:max-w-4xl md:px-8 md:py-6">
        <div className="p-4 md:p-0 space-y-4">
          {/* Purchase info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('purchases_info')}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">{t('purchases_supplier')}</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{purchase.supplierName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('purchases_date')}</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(purchase.receiptDate)}</p>
              </div>
              {purchase.totalAmount !== null && (
                <div>
                  <p className="text-xs text-gray-400">{t('purchases_totalAmount')}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">RM {parseFloat(purchase.totalAmount).toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('purchases_items')}</p>
            {purchase.items.length === 0 ? (
              <p className="text-sm text-gray-400">{t('purchases_noItems')}</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {purchase.items.map((item) => (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.rawMaterialName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {parseFloat(item.quantity)} {item.purchaseUnit}
                          {item.pricePerUnit !== null && ` · RM ${parseFloat(item.pricePerUnit).toFixed(2)} / ${item.purchaseUnit}`}
                        </p>
                      </div>
                      {item.totalPrice !== null && (
                        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          RM {parseFloat(item.totalPrice).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {purchase.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('purchases_notes')}</p>
              <p className="text-sm text-gray-700">{purchase.notes}</p>
            </div>
          )}

          {purchase.status === 'SUBMITTED' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
              <p className="text-sm text-emerald-700 font-medium">✓ {t('purchases_stockUpdated')}</p>
              <p className="text-xs text-emerald-600 mt-0.5">{t('purchases_stockUpdatedDesc')}</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>

      {showDeleteDialog && (
        <ArchiveDialog
          title={t('purchases_deleteConfirm')}
          description="This purchase and all its items will be permanently removed."
          confirmLabel="Delete"
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setShowDeleteDialog(false)}
          confirming={deleting}
        />
      )}

      {/* Action bar */}
      {isDraft && (
        <div className="fixed bottom-0 left-0 right-0 md:static md:mt-4 md:max-w-4xl md:mx-0 md:px-8 bg-white border-t border-gray-200 md:border-0 md:bg-transparent p-4 space-y-2 md:pb-8">
          <button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 hover:bg-brand-600 transition-colors"
          >
            {submitting ? t('common_saving') : t('purchases_submitButton')}
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting}
            className="w-full text-red-500 font-medium py-2 text-sm disabled:opacity-60"
          >
            {t('purchases_deleteButton')}
          </button>
        </div>
      )}
    </div>
  )
}
