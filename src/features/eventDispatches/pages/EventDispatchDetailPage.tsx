import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorState from '../../../components/ErrorState'
import { useT } from '../../../hooks/useT'
import { useFormatDate } from '../../../hooks/useFormatDate'

type ConsignmentItem = {
  id: string
  productId: string
  productName: string
  unit: string
  dispatchedQty: string
  soldQty: string | null
  returnedQty: string | null
}

type Consignment = {
  id: string
  name: string
  eventDate: string | null
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED'
  notes: string | null
  createdBy: string
  completedAt: string | null
  createdAt: string
  items: ConsignmentItem[]
}

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export default function EventDispatchDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const queryClient = useQueryClient()
  const { formatDate: _formatDate } = useFormatDate()

  const [soldQtys, setSoldQtys] = useState<Record<string, string>>({})
  const [completing, setCompleting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return _formatDate(dateStr)
  }

  const { data: consignment, isLoading, isError, refetch } = useQuery({
    queryKey: ['consignment', id],
    queryFn: () => apiFetch<Consignment>(`/api/v1/event-dispatches/${id}`, { token }),
    enabled: !!token && !!id,
  })

  function initSoldQtys() {
    if (!consignment) return
    const initial: Record<string, string> = {}
    consignment.items.forEach((item) => {
      initial[item.id] = item.dispatchedQty
    })
    setSoldQtys(initial)
    setShowCompleteModal(true)
  }

  async function handleComplete() {
    if (!consignment) return
    setError(null)
    setCompleting(true)
    try {
      const freshToken = await refreshToken()
      await apiFetch(`/api/v1/event-dispatches/${id}/complete`, {
        method: 'POST',
        token: freshToken,
        body: JSON.stringify({
          itemResults: consignment.items.map((item) => ({
            itemId: item.id,
            soldQty: parseFloat(soldQtys[item.id] ?? '0') || 0,
          })),
        }),
      })
      await queryClient.invalidateQueries({ queryKey: ['consignment', id] })
      await queryClient.invalidateQueries({ queryKey: ['consignments'] })
      setShowCompleteModal(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('consignment_completeError'))
    } finally {
      setCompleting(false)
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this consignment? All stock will be returned.')) return
    setError(null)
    setCancelling(true)
    try {
      const freshToken = await refreshToken()
      await apiFetch(`/api/v1/event-dispatches/${id}/cancel`, {
        method: 'POST',
        token: freshToken,
      })
      await queryClient.invalidateQueries({ queryKey: ['consignment', id] })
      await queryClient.invalidateQueries({ queryKey: ['consignments'] })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('consignment_cancelError'))
    } finally {
      setCancelling(false)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (isError || !consignment) {
    return <ErrorState message={t('consignment_loadError')} onRetry={() => void refetch()} />
  }

  return (
    <div className="min-h-screen bg-brand-50 pb-20 md:pb-6">
      {/* Mobile header */}
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/consignments')} className="text-gray-500 hover:text-gray-700 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900 truncate">{consignment.name}</h1>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[consignment.status]}`}>
            {t(`consignment_status_${consignment.status}` as Parameters<typeof t>[0])}
          </span>
        </div>
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button onClick={() => navigate('/consignments')} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1 truncate">{consignment.name}</h1>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[consignment.status]}`}>
          {t(`consignment_status_${consignment.status}` as Parameters<typeof t>[0])}
        </span>
      </header>

      <div className="px-4 md:px-8 py-4 max-w-xl space-y-4">
        {/* Info card */}
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('consignment_eventDate')}</span>
            <span className="text-gray-900 font-medium">{formatDate(consignment.eventDate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Created</span>
            <span className="text-gray-900 font-medium">{formatDate(consignment.createdAt)}</span>
          </div>
          {consignment.completedAt && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Completed</span>
              <span className="text-gray-900 font-medium">{formatDate(consignment.completedAt)}</span>
            </div>
          )}
          {consignment.notes && (
            <p className="text-sm text-gray-600 pt-1 border-t border-gray-50">{consignment.notes}</p>
          )}
        </div>

        {/* Items */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">{t('consignment_items')}</h2>
          <div className="space-y-2">
            {consignment.items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.unit}</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="bg-amber-50 rounded-lg py-1.5">
                    <p className="text-amber-700 font-semibold">{Number(item.dispatchedQty).toFixed(2)}</p>
                    <p className="text-amber-500">{t('consignment_dispatchedQty')}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg py-1.5">
                    <p className="text-emerald-700 font-semibold">
                      {item.soldQty !== null ? Number(item.soldQty).toFixed(2) : '—'}
                    </p>
                    <p className="text-emerald-500">{t('consignment_soldQty')}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg py-1.5">
                    <p className="text-blue-700 font-semibold">
                      {item.returnedQty !== null ? Number(item.returnedQty).toFixed(2) : '—'}
                    </p>
                    <p className="text-blue-500">{t('consignment_returnedQty')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Actions for OPEN */}
        {consignment.status === 'OPEN' && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={initSoldQtys}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {t('consignment_complete')}
            </button>
            <button
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {cancelling ? '...' : t('consignment_cancel')}
            </button>
          </div>
        )}
      </div>

      {/* Complete modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-4 md:pb-0">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4">
            <h2 className="text-base font-bold text-gray-900">{t('consignment_complete')}</h2>
            <p className="text-sm text-gray-500">Enter quantity sold for each item. Unsold items will be returned to stock.</p>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {consignment.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400">Sent: {Number(item.dispatchedQty).toFixed(2)} {item.unit}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={item.dispatchedQty}
                    step="any"
                    value={soldQtys[item.id] ?? ''}
                    onChange={(e) => setSoldQtys((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="w-24 border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleComplete()}
                disabled={completing}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                {completing ? '...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
