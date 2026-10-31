import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorState from '../../../components/ErrorState'
import { useT } from '../../../hooks/useT'
import { useFormatDate } from '../../../hooks/useFormatDate'

type OrderItem = {
  itemName: string
  quantity: string
  pricePerUnit: string
  totalPrice: string
}

type Order = {
  id: string
  customerName: string | null
  customerPhone: string | null
  status: string
  channel: string
  totalAmount: string | null
  notes: string | null
  items: OrderItem[]
  createdAt: string
}

const STATUS_FLOW: Record<string, string> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'READY',
  READY: 'DELIVERED',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-brand-100 text-brand-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  READY: 'bg-emerald-100 text-emerald-700',
  DELIVERED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

export default function OrderDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const { formatDateTime } = useFormatDate()
  const queryClient = useQueryClient()
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const STATUS_LABELS: Record<string, string> = {
    PENDING: t('orders_pending'),
    CONFIRMED: t('orders_confirmed'),
    PROCESSING: t('orders_preparing'),
    READY: t('orders_ready'),
    DELIVERED: t('orders_delivered'),
    CANCELLED: t('orders_cancelled'),
  }

  const NEXT_LABELS: Record<string, string> = {
    PENDING: t('orders_nextLabel_pending'),
    CONFIRMED: t('orders_nextLabel_confirmed'),
    PROCESSING: t('orders_nextLabel_preparing'),
    READY: t('orders_nextLabel_ready'),
  }

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => apiFetch<Order>(`/api/v1/orders/${id}`, { token }),
    enabled: !!token && !!id,
  })

  async function updateStatus(status: string) {
    const freshToken = await refreshToken()
    if (!freshToken) { setStatusError(t('orders_errorUpdate')); return }
    setIsPending(true)
    setStatusError(null)
    try {
      await apiFetch(`/api/v1/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        token: freshToken,
      })
      void queryClient.invalidateQueries({ queryKey: ['order', id] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : t('orders_errorUpdate'))
    } finally {
      setIsPending(false)
    }
  }

  async function cancelOrder() {
    const freshToken = await refreshToken()
    if (!freshToken) return
    setCancelling(true)
    try {
      await apiFetch(`/api/v1/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
        token: freshToken,
      })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['orders-counts'] })
      navigate('/orders')
    } finally {
      setCancelling(false)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (isError || !order) return <ErrorState onRetry={() => void refetch()} />

  const nextStatus = STATUS_FLOW[order.status]
  const statusColorClass = STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'

  const actionBar = order.status !== 'CANCELLED' ? (
    <div className="fixed bottom-0 left-0 right-0 md:left-60 bg-white border-t border-gray-100 px-4 py-3 space-y-2 md:px-6">
      {statusError && <p className="text-xs text-red-600 text-center">{statusError}</p>}
      {nextStatus && order.status !== 'DELIVERED' && (
        <button
          onClick={() => { setStatusError(null); void updateStatus(nextStatus) }}
          disabled={isPending}
          className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 hover:bg-brand-600 transition-colors"
        >
          {isPending ? t('orders_updating') : (NEXT_LABELS[order.status] ?? t('orders_statusUpdate'))}
        </button>
      )}
      <button
        onClick={() => { if (confirm(t('orders_cancelConfirm'))) void cancelOrder() }}
        disabled={cancelling}
        className="w-full text-red-500 font-medium py-2 text-sm disabled:opacity-60 hover:text-red-600"
      >
        {t('orders_cancelButton')}
      </button>
    </div>
  ) : null

  return (
    <div className="min-h-screen bg-slate-50 md:bg-white pb-32 md:pb-28">
      {/* Header — shared */}
      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base md:text-lg font-semibold text-gray-900 flex-1">{t('orders_detailTitle')}</h1>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColorClass}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </header>

      {/* ── Mobile layout (card-based) ── */}
      <div className="md:hidden p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('orders_customer')}</p>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">{order.customerName ?? t('orders_noName')}</p>
            {order.customerPhone && (
              <a href={`tel:${order.customerPhone}`} className="text-sm text-brand-600">
                {order.customerPhone}
              </a>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('orders_items')}</p>
          {order.items.length === 0 ? (
            <p className="text-sm text-gray-400">{t('orders_noItems')}</p>
          ) : (
            <ul className="space-y-2">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">{item.itemName}</p>
                    <p className="text-xs text-gray-400">x{parseFloat(item.quantity)}</p>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-nowrap">RM {parseFloat(item.totalPrice).toFixed(2)}</p>
                </li>
              ))}
            </ul>
          )}
          {order.totalAmount !== null && (
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <p className="text-sm font-semibold text-gray-900">{t('orders_totalAmount')}</p>
              <p className="text-sm font-semibold text-gray-900">RM {parseFloat(order.totalAmount).toFixed(2)}</p>
            </div>
          )}
        </div>

        {order.notes && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('orders_notes')}</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          {t('orders_receivedAt')} {formatDateTime(order.createdAt)} · {t('orders_sourceLabel')} {order.channel}
        </p>
      </div>

      {/* ── Desktop layout (section dividers) ── */}
      <div className="hidden md:block">
        {/* Customer */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('orders_customer')}</p>
          <p className="text-sm font-medium text-gray-900">{order.customerName ?? t('orders_noName')}</p>
          {order.customerPhone && (
            <a href={`tel:${order.customerPhone}`} className="text-sm text-brand-600 mt-0.5 block">
              {order.customerPhone}
            </a>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* Order items */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t('orders_items')}</p>
          {order.items.length === 0 ? (
            <p className="text-sm text-gray-400">{t('orders_noItems')}</p>
          ) : (
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">{item.itemName}</p>
                    <p className="text-xs text-gray-400">x{parseFloat(item.quantity)}</p>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-nowrap tabular-nums">
                    RM {parseFloat(item.totalPrice).toFixed(2)}
                  </p>
                </div>
              ))}
              {order.totalAmount !== null && (
                <div className="border-t border-gray-100 pt-3 mt-1 flex justify-between">
                  <p className="text-sm font-bold text-gray-900">{t('orders_totalAmount')}</p>
                  <p className="text-sm font-bold text-gray-900 tabular-nums">
                    RM {parseFloat(order.totalAmount).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {order.notes && (
          <>
            <div className="border-t border-gray-100" />
            <div className="px-6 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('orders_notes')}</p>
              <p className="text-sm text-gray-700">{order.notes}</p>
            </div>
          </>
        )}

        <div className="border-t border-gray-100" />

        <div className="px-6 py-4 text-center">
          <p className="text-xs text-gray-400">
            {t('orders_receivedAt')} {formatDateTime(order.createdAt)} · {t('orders_sourceLabel')} {order.channel}
          </p>
        </div>
      </div>

      {actionBar}
    </div>
  )
}
