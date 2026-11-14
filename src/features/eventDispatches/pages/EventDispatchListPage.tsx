import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'
import Pagination from '../../../components/Pagination'
import { useT } from '../../../hooks/useT'
import { useFormatDate } from '../../../hooks/useFormatDate'

type Consignment = {
  id: string
  name: string
  eventDate: string | null
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED'
  notes: string | null
  createdAt: string
}

type ListResponse = {
  items: Consignment[]
  total: number
  page: number
  pageSize: number
}

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export default function EventDispatchListPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const t = useT()
  const { formatDate: _formatDate } = useFormatDate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'COMPLETED' | 'CANCELLED'>('ALL')

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return _formatDate(dateStr)
  }

  const params = new URLSearchParams()
  params.set('page', String(page))
  if (statusFilter !== 'ALL') params.set('status', statusFilter)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['consignments', page, statusFilter],
    queryFn: () => apiFetch<ListResponse>(`/api/v1/event-dispatches?${params}`, { token }),
    enabled: !!token,
  })

  const items = data?.items ?? []

  return (
    <div className="min-h-screen bg-brand-50 pb-20 md:pb-6">
      {/* Mobile header */}
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-brand-950">{t('consignment_title')}</h1>
          <button
            onClick={() => navigate('/consignments/new')}
            className="bg-brand-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
          >
            + {t('consignment_new')}
          </button>
        </div>
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('consignment_title')}</h1>
        <button
          onClick={() => navigate('/consignments/new')}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + {t('consignment_new')}
        </button>
      </header>

      <div className="px-4 md:px-6 pb-4 md:pt-6">
        <p className="text-xs text-gray-500 pb-2 md:pb-3">
          Track products you send to events or other sellers. Record how many were sent, sold, and returned when done.
        </p>
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          {(['ALL', 'OPEN', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300'
              }`}
            >
              {s === 'ALL' ? 'All' : t(`consignment_status_${s}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>

        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState message={t('consignment_loadError')} onRetry={() => void refetch()} />}

        {!isLoading && !isError && items.length === 0 && (
          <EmptyState title={t('consignment_noItems')} />
        )}

        {!isLoading && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/consignments/${item.id}`)}
                className="w-full text-left bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{formatDate(item.eventDate)}</p>
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{item.notes}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[item.status]}`}>
                    {t(`consignment_status_${item.status}` as Parameters<typeof t>[0])}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">{formatDate(item.createdAt)}</p>
              </button>
            ))}
          </div>
        )}

        {data && data.total > data.pageSize && (
          <div className="mt-4">
            <Pagination
              page={page}
              pageSize={data.pageSize}
              total={data.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  )
}
