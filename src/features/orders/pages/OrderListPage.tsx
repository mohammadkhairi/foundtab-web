import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Joyride, type EventData, STATUS } from 'react-joyride'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import { useT } from '../../../hooks/useT'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'
import Pagination from '../../../components/Pagination'
import { useOnboardingTour } from '../../onboarding/hooks/useOnboardingTour'
import { useFormatDate } from '../../../hooks/useFormatDate'

type Order = {
  id: string
  customerName: string | null
  customerPhone: string | null
  status: string
  totalAmount: string | null
  createdAt: string
}

type ListResponse = {
  items: Order[]
  total: number
  page: number
  pageSize: number
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-brand-100 text-brand-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  READY: 'bg-emerald-100 text-emerald-700',
  DELIVERED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
}

export default function OrderListPage() {
  const navigate = useNavigate()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const { formatDate } = useFormatDate()
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('orders')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadTemplate() {
    const freshToken = await refreshToken()
    if (!freshToken) return
    setDownloading(true)
    try {
      const res = await fetch('/api/v1/orders/template', {
        headers: { Authorization: `Bearer ${freshToken}` },
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'FoundTab_Order_Form.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  const STATUS_LABELS: Record<string, string> = {
    PENDING: t('orders_pending'),
    CONFIRMED: t('orders_confirmed'),
    PROCESSING: t('orders_preparing'),
    READY: t('orders_ready'),
    DELIVERED: t('orders_delivered'),
    CANCELLED: t('orders_cancelled'),
  }

  const { data: counts } = useQuery({
    queryKey: ['orders-counts'],
    queryFn: () => apiFetch<{ preparing: number; sold: number; all: number }>('/api/v1/orders/counts', { token }),
    enabled: !!token,
  })

  function handleFilterChange(value: string) {
    setStatusFilter(value)
    setPage(1)
  }

  const filters = [
    { value: 'preparing', label: t('orders_filterPreparing'), count: counts?.preparing },
    { value: 'DELIVERED', label: t('orders_delivered'), count: counts?.sold },
    { value: 'all', label: t('orders_filterAll'), count: counts?.all },
  ]

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      if (statusFilter === 'preparing') params.set('active', 'true')
      else if (statusFilter !== 'all') params.set('status', statusFilter)
      return apiFetch<ListResponse>(`/api/v1/orders?${params}`, { token })
    },
    enabled: !!token,
  })

  function handleTourCallback(data: EventData) {
    const finished = ([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(data.status)
    if (finished) onTourFinish()
  }

  const items = data?.items ?? []

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-6">
      <Joyride
        steps={steps}
        run={shouldRun}
        continuous
        onEvent={handleTourCallback}
      />

      {/* Mobile header */}
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-semibold text-gray-900" data-tour="order-list">{t('orders_title')}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => void handleDownloadTemplate()}
              disabled={downloading}
              className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-full font-medium disabled:opacity-50"
              title="Download order template"
            >
              {downloading ? '...' : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>
            <button
              data-tour="order-whatsapp"
              onClick={() => navigate('/orders/whatsapp')}
              className="text-xs text-green-600 border border-green-300 px-3 py-1.5 rounded-full font-medium"
            >
              {t('orders_whatsapp')}
            </button>
            <button
              onClick={() => navigate('/orders/new')}
              className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center"
              aria-label={t('orders_add')}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === f.value ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.label}
              {f.count !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  statusFilter === f.value ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-900 flex-1" data-tour="order-list">{t('orders_title')}</h1>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                statusFilter === f.value ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
              {f.count !== undefined && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  statusFilter === f.value ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => void handleDownloadTemplate()}
          disabled={downloading}
          className="text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloading ? 'Downloading...' : 'Template'}
        </button>
        <button
          data-tour="order-whatsapp"
          onClick={() => navigate('/orders/whatsapp')}
          className="text-sm text-green-600 border border-green-300 px-3 py-1.5 rounded-lg font-medium hover:bg-green-50 transition-colors"
        >
          {t('orders_whatsapp')}
        </button>
        <button
          onClick={() => navigate('/orders/new')}
          className="bg-brand-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-brand-600 transition-colors"
        >
          + {t('orders_add')}
        </button>
      </header>

      {/* Mobile list */}
      <div className="p-4 md:hidden">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !items.length && (
          <EmptyState
            title={t('orders_emptyTitle')}
            description={t('orders_emptyDesc')}
            actionLabel={t('orders_emptyAction')}
            onAction={() => navigate('/orders/new')}
          />
        )}
        {!isLoading && !isError && !!items.length && (
          <>
            <ul className="space-y-2">
              {items.map((order) => (
                <li key={order.id}>
                  <button
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="w-full bg-white rounded-2xl border border-gray-100 shadow-card p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {order.customerName ?? t('orders_noName')}
                        </p>
                        {order.customerPhone && (
                          <p className="text-xs text-gray-400">{order.customerPhone}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                        {order.totalAmount !== null && (
                          <p className="text-xs font-semibold text-gray-800">RM {parseFloat(order.totalAmount).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
          </>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block px-6 py-5">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !items.length && (
          <EmptyState
            title={t('orders_emptyTitle')}
            description={t('orders_emptyDesc')}
            actionLabel={t('orders_emptyAction')}
            onAction={() => navigate('/orders/new')}
          />
        )}
        {!isLoading && !isError && !!items.length && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('orders_customer')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('stockMovements_type')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">{t('orders_totalAmount')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('stockMovements_date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{order.customerName ?? t('orders_noName')}</p>
                        {order.customerPhone && (
                          <p className="text-xs text-gray-400">{order.customerPhone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                        {order.totalAmount !== null ? `RM ${parseFloat(order.totalAmount).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
