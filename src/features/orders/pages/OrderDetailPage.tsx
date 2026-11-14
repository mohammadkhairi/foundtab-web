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
  itemType: string | null
  productId: string | null
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
  fulfillmentType: 'STOCK' | 'PRODUCE'
  fulfillmentDate: string | null
  totalAmount: string | null
  notes: string | null
  covers: number | null
  items: OrderItem[]
  createdAt: string
}

type LinkedProduction = {
  id: string
  status: string
  batchCount: string
  createdAt: string
}

type StockCheckItem = {
  productId: string
  productName: string
  needed: number
  available: number
  sufficient: boolean
}

type StockCheck = {
  sufficient: boolean
  items: StockCheckItem[]
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
  const [showCancelModal, setShowCancelModal] = useState(false)

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

  const { data: linkedProductionsData } = useQuery({
    queryKey: ['productions', 'by-order', id],
    queryFn: () => apiFetch<{ items: LinkedProduction[] }>(`/api/v1/productions?orderId=${id}`, { token }),
    enabled: !!token && !!id && order?.fulfillmentType === 'PRODUCE',
  })

  const activeStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY']
  const { data: stockCheck } = useQuery({
    queryKey: ['order-stock-check', id],
    queryFn: () => apiFetch<StockCheck>(`/api/v1/orders/${id}/stock-check`, { token }),
    enabled: !!token && !!id && order?.fulfillmentType === 'PRODUCE' && activeStatuses.includes(order?.status ?? ''),
    refetchInterval: 30_000,
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
      setShowCancelModal(false)
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (isError || !order) return <ErrorState onRetry={() => void refetch()} />

  const nextStatus = STATUS_FLOW[order.status]
  const statusColorClass = STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'
  const isProduceOrder = order.fulfillmentType === 'PRODUCE'
  const linkedProductions = linkedProductionsData?.items ?? []

  const cancelModal = showCancelModal ? (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">{t('orders_cancelConfirm')}</h2>
        <p className="text-sm text-gray-500">
          The order will be marked cancelled. If it was already delivered, your stock will be restored automatically.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCancelModal(false)}
            className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            {t('common_back')}
          </button>
          <button
            onClick={() => void cancelOrder()}
            disabled={cancelling}
            className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {cancelling ? '...' : t('orders_cancelButton')}
          </button>
        </div>
      </div>
    </div>
  ) : null

  const produceBanner = isProduceOrder && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' ? (
    <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-purple-700">Items need to be made first</p>
          <p className="text-xs text-purple-600 mt-0.5">
            {order.fulfillmentDate
              ? `Due date: ${order.fulfillmentDate}`
              : 'Run a production before marking this order as delivered'}
          </p>
        </div>
        <button
          onClick={() => navigate(`/productions/new?fromOrderId=${order.id}`)}
          className="shrink-0 text-xs font-semibold bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
        >
          + Make items
        </button>
      </div>

      {/* Stock readiness indicator */}
      {stockCheck && stockCheck.items.length > 0 && (
        <div className={`rounded-lg border px-3 py-2.5 space-y-1 ${
          stockCheck.sufficient ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <p className={`text-xs font-semibold ${stockCheck.sufficient ? 'text-emerald-700' : 'text-amber-700'}`}>
            {stockCheck.sufficient
              ? '✓ Enough stock to deliver this order'
              : '⚠ Not enough stock yet — production may still be needed'}
          </p>
          {!stockCheck.sufficient && (
            <ul className="space-y-0.5 mt-1">
              {stockCheck.items.filter((i) => !i.sufficient).map((item) => (
                <li key={item.productId} className="text-xs text-amber-700">
                  {item.productName}: need {item.needed}, have {item.available.toFixed(2)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {linkedProductions.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-purple-100">
          <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Production runs</p>
          {linkedProductions.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate('/productions')}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="text-xs text-purple-700">
                {parseFloat(p.batchCount)} batch{parseFloat(p.batchCount) !== 1 ? 'es' : ''}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                p.status === 'PLANNED' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {p.status === 'COMPLETED' ? 'Done' : p.status === 'PLANNED' ? 'In queue' : p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null

  const actionBar = order.status !== 'CANCELLED' ? (
    <div className="fixed bottom-0 left-0 right-0 md:left-60 z-30 bg-white border-t border-gray-100 px-4 py-3 space-y-2 md:px-6">
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
      {order.status === 'READY' && nextStatus === 'DELIVERED' && (
        <p className="text-xs text-center text-gray-400">
          {order.fulfillmentType === 'PRODUCE'
            ? 'Delivering will deduct the produced items from your stock.'
            : 'Delivering will deduct these items from your stock.'}
        </p>
      )}
      <button
        onClick={() => setShowCancelModal(true)}
        disabled={cancelling}
        className="w-full text-red-500 font-medium py-2 text-sm disabled:opacity-60 hover:text-red-600"
      >
        {t('orders_cancelButton')}
      </button>
    </div>
  ) : null

  return (
    <div className="min-h-screen bg-brand-50 md:bg-white pb-32 md:pb-28">
      {cancelModal}

      {/* Header — shared */}
      <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base md:text-lg font-semibold text-gray-900 flex-1">{t('orders_detailTitle')}</h1>
          <div className="flex items-center gap-2">
            {isProduceOrder && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Produce
              </span>
            )}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColorClass}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
        </div>
      </header>

      {/* ── Mobile layout (card-based) ── */}
      <div className="md:hidden p-4 space-y-4">
        {produceBanner}

        {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card px-4 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Order progress</p>
            <div className="flex items-center gap-1">
              {(['PENDING', 'CONFIRMED', 'PROCESSING', 'READY'] as const).map((s, i) => {
                const labels: Record<string, string> = {
                  PENDING: 'Received',
                  CONFIRMED: 'Confirmed',
                  PROCESSING: 'Preparing',
                  READY: 'Ready',
                }
                const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'DELIVERED']
                const currentIdx = statuses.indexOf(order.status)
                const stepIdx = statuses.indexOf(s)
                const isDone = stepIdx < currentIdx
                const isCurrent = s === order.status
                return (
                  <div key={s} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isCurrent ? 'bg-brand-500' : isDone ? 'bg-brand-300' : 'bg-gray-200'}`} />
                      <span className={`text-xs mt-0.5 text-center truncate w-full ${isCurrent ? 'text-brand-600 font-semibold' : isDone ? 'text-brand-400' : 'text-gray-300'}`}>
                        {labels[s]}
                      </span>
                    </div>
                    {i < 3 && <div className={`h-0.5 flex-1 mx-1 mt-[-8px] ${isDone || isCurrent ? 'bg-brand-200' : 'bg-gray-200'}`} />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
          {(order.covers || order.fulfillmentDate) && (
            <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-3 text-xs text-gray-500">
              {order.covers && <span>{order.covers} customer{order.covers !== 1 ? 's' : ''}</span>}
              {order.fulfillmentDate && <span className="text-blue-600">Due: {order.fulfillmentDate}</span>}
            </div>
          )}
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
        {produceBanner && <div className="px-6 pt-5">{produceBanner}</div>}

        {/* Order progress — desktop */}
        {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
          <div className="px-6 pt-5">
            <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Order progress</p>
              <div className="flex items-center">
                {(['PENDING', 'CONFIRMED', 'PROCESSING', 'READY'] as const).map((s, i) => {
                  const labels: Record<string, string> = {
                    PENDING: 'Received',
                    CONFIRMED: 'Confirmed',
                    PROCESSING: 'Preparing',
                    READY: 'Ready to deliver',
                  }
                  const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'DELIVERED']
                  const currentIdx = statuses.indexOf(order.status)
                  const stepIdx = statuses.indexOf(s)
                  const isDone = stepIdx < currentIdx
                  const isCurrent = s === order.status
                  return (
                    <div key={s} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center flex-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${isCurrent ? 'bg-brand-500 ring-4 ring-brand-100' : isDone ? 'bg-brand-400' : 'bg-gray-200'}`} />
                        <span className={`text-xs mt-1 text-center ${isCurrent ? 'text-brand-600 font-semibold' : isDone ? 'text-brand-400' : 'text-gray-300'}`}>
                          {labels[s]}
                        </span>
                      </div>
                      {i < 3 && <div className={`h-0.5 flex-1 mx-2 mt-[-10px] ${isDone ? 'bg-brand-300' : 'bg-gray-200'}`} />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Customer */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('orders_customer')}</p>
          <p className="text-sm font-medium text-gray-900">{order.customerName ?? t('orders_noName')}</p>
          {order.customerPhone && (
            <a href={`tel:${order.customerPhone}`} className="text-sm text-brand-600 mt-0.5 block">
              {order.customerPhone}
            </a>
          )}
          {(order.covers || order.fulfillmentDate) && (
            <div className="mt-2 flex gap-4 text-xs text-gray-400">
              {order.covers && <span>{order.covers} customer{order.covers !== 1 ? 's' : ''}</span>}
              {order.fulfillmentDate && <span className="text-blue-600">Due: {order.fulfillmentDate}</span>}
            </div>
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
