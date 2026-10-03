import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'

type StockMovement = {
  id: string
  rawMaterialName: string
  movementType: string
  quantityDelta: number
  unit: string
  balanceAfter: number
  notes: string | null
  createdAt: string
}

type ListResponse = {
  items: StockMovement[]
  total: number
}

const MOVEMENT_LABELS: Record<string, string> = {
  purchase: 'Pembelian',
  production: 'Pengeluaran',
  adjustment: 'Pelarasan',
  wastage: 'Pembaziran',
}

const MOVEMENT_COLORS: Record<string, string> = {
  purchase: 'text-emerald-600',
  production: 'text-amber-600',
  adjustment: 'text-sky-600',
  wastage: 'text-red-500',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ms-MY', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function StockMovementHistoryPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['stockMovements', typeFilter],
    queryFn: () =>
      apiFetch<ListResponse>(
        `/api/v1/stock-movements${typeFilter !== 'all' ? `?type=${typeFilter}` : ''}`,
        { token },
      ),
    enabled: !!token,
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label="Kembali">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900">Pergerakan stok</h1>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: 'all', label: 'Semua' },
            { value: 'purchase', label: 'Pembelian' },
            { value: 'production', label: 'Pengeluaran' },
            { value: 'adjustment', label: 'Pelarasan' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors ${
                typeFilter === f.value ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'
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
            title="Tiada pergerakan stok"
            description="Rekod pembelian atau pengeluaran untuk lihat pergerakan stok."
          />
        )}
        {!isLoading && !isError && !!data?.items.length && (
          <ul className="space-y-2">
            {data.items.map((mv) => (
              <li key={mv.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{mv.rawMaterialName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(mv.createdAt)}</p>
                    {mv.notes && <p className="text-xs text-gray-500 italic mt-0.5">{mv.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${MOVEMENT_COLORS[mv.movementType] ?? 'text-gray-700'}`}>
                      {mv.quantityDelta > 0 ? '+' : ''}{mv.quantityDelta} {mv.unit}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {MOVEMENT_LABELS[mv.movementType] ?? mv.movementType}
                    </p>
                    <p className="text-xs text-gray-400">Baki: {mv.balanceAfter} {mv.unit}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
