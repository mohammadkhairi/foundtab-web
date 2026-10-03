import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorState from '../../../components/ErrorState'

type OrderItem = {
  description: string
  quantity: number
  unitPrice: number | null
  totalPrice: number | null
}

type Order = {
  id: string
  customerName: string | null
  customerPhone: string | null
  status: string
  source: string
  totalAmount: number | null
  deliveryDate: string | null
  notes: string | null
  items: OrderItem[]
  createdAt: string
}

const STATUS_FLOW: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  confirmed: 'Disahkan',
  preparing: 'Dalam penyediaan',
  ready: 'Sedia',
  delivered: 'Dihantar',
  cancelled: 'Dibatal',
}

const NEXT_LABELS: Record<string, string> = {
  pending: 'Sahkan pesanan',
  confirmed: 'Mula penyediaan',
  preparing: 'Tandakan sedia',
  ready: 'Tandakan dihantar',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function OrderDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [statusError, setStatusError] = useState<string | null>(null)

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => apiFetch<Order>(`/api/v1/orders/${id}`, { token }),
    enabled: !!token && !!id,
  })

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/api/v1/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['order', id] })
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setStatusError(err.message)
      } else {
        setStatusError('Gagal mengemaskini status.')
      }
    },
  })

  const { mutate: cancelOrder, isPending: cancelling } = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate('/orders')
    },
  })

  if (isLoading) return <LoadingSpinner />
  if (isError || !order) return <ErrorState onRetry={() => void refetch()} />

  const nextStatus = STATUS_FLOW[order.status]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label="Kembali">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900 flex-1">Butiran pesanan</h1>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
            order.status === 'delivered' ? 'bg-gray-100 text-gray-600' :
            'bg-sky-100 text-sky-700'
          }`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pelanggan</p>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">{order.customerName ?? 'Tanpa nama'}</p>
            {order.customerPhone && (
              <a href={`tel:${order.customerPhone}`} className="text-sm text-sky-600">
                {order.customerPhone}
              </a>
            )}
            {order.deliveryDate && (
              <p className="text-xs text-gray-500">Hantar: {formatDate(order.deliveryDate)}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</p>
          {order.items.length === 0 ? (
            <p className="text-sm text-gray-400">Tiada item.</p>
          ) : (
            <ul className="space-y-2">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">{item.description}</p>
                    <p className="text-xs text-gray-400">x{item.quantity}</p>
                  </div>
                  {item.totalPrice !== null && (
                    <p className="text-sm text-gray-700 whitespace-nowrap">RM {item.totalPrice.toFixed(2)}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {order.totalAmount !== null && (
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <p className="text-sm font-semibold text-gray-900">Jumlah</p>
              <p className="text-sm font-semibold text-gray-900">RM {order.totalAmount.toFixed(2)}</p>
            </div>
          )}
        </div>

        {order.notes && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nota</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </div>
        )}

        <div className="text-xs text-gray-400 text-center">
          Diterima: {new Date(order.createdAt).toLocaleString('ms-MY')} · Sumber: {order.source}
        </div>
      </div>

      {(nextStatus || order.status === 'pending') && order.status !== 'cancelled' && order.status !== 'delivered' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-2">
          {statusError && <p className="text-xs text-red-600 text-center">{statusError}</p>}
          {nextStatus && (
            <button
              onClick={() => { setStatusError(null); updateStatus(nextStatus) }}
              disabled={isPending}
              className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
            >
              {isPending ? 'Mengemaskini...' : (NEXT_LABELS[order.status] ?? 'Kemaskini status')}
            </button>
          )}
          {order.status !== 'cancelled' && (
            <button
              onClick={() => { if (confirm('Batal pesanan ini?')) cancelOrder() }}
              disabled={cancelling}
              className="w-full text-red-500 font-medium py-2 text-sm disabled:opacity-60"
            >
              Batal pesanan
            </button>
          )}
        </div>
      )}
    </div>
  )
}
