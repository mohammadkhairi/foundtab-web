import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Joyride, type EventData, STATUS } from 'react-joyride'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { useOnboardingTour } from '../../onboarding/hooks/useOnboardingTour'

type Order = {
  id: string
  customerName: string | null
  customerPhone: string | null
  status: string
  totalAmount: number | null
  deliveryDate: string | null
  createdAt: string
}

type ListResponse = {
  items: Order[]
  total: number
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  confirmed: 'Disahkan',
  preparing: 'Dalam penyediaan',
  ready: 'Sedia',
  delivered: 'Dihantar',
  cancelled: 'Dibatal',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-sky-100 text-sky-700',
  preparing: 'bg-purple-100 text-purple-700',
  ready: 'bg-emerald-100 text-emerald-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })
}

export default function OrderListPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('orders')
  const [statusFilter, setStatusFilter] = useState<string>('active')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () =>
      apiFetch<ListResponse>(`/api/v1/orders?status=${statusFilter}`, { token }),
    enabled: !!token,
  })

  function handleTourCallback(data: EventData) {
    const finished = ([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(data.status)
    if (finished) onTourFinish()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Joyride
        steps={steps}
        run={shouldRun}
        continuous
        onEvent={handleTourCallback}
      />

      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-semibold text-gray-900" data-tour="order-list">Pesanan</h1>
          <div className="flex gap-2">
            <button
              data-tour="order-whatsapp"
              onClick={() => navigate('/orders/whatsapp')}
              className="text-xs text-green-600 border border-green-300 px-3 py-1.5 rounded-full font-medium"
            >
              WhatsApp
            </button>
            <button
              onClick={() => navigate('/orders/new')}
              className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center"
              aria-label="Tambah pesanan"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: 'active', label: 'Aktif' },
            { value: 'all', label: 'Semua' },
            { value: 'delivered', label: 'Dihantar' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors ${
                statusFilter === f.value ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !data?.items.length && (
          <EmptyState
            title="Tiada pesanan"
            description="Tambah pesanan baru atau import dari WhatsApp."
            actionLabel="Tambah pesanan"
            onAction={() => navigate('/orders/new')}
          />
        )}
        {!isLoading && !isError && !!data?.items.length && (
          <ul className="space-y-2">
            {data.items.map((order) => (
              <li key={order.id}>
                <button
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {order.customerName ?? 'Pelanggan tanpa nama'}
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
                        <p className="text-xs font-semibold text-gray-800">RM {order.totalAmount.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                  {order.deliveryDate && (
                    <p className="text-xs text-gray-400 mt-1">
                      Hantar: {formatDate(order.deliveryDate)}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
