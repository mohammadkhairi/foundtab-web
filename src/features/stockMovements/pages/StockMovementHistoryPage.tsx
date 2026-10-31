import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'
import Pagination from '../../../components/Pagination'
import { useT } from '../../../hooks/useT'
import { useFormatDate } from '../../../hooks/useFormatDate'
import { formatDelta } from '../../../lib/units'

type StockMovement = {
  id: string
  type: string
  entityType: string
  entityId: string
  entityName: string | null
  quantityDelta: string
  unit: string
  notes: string | null
  createdAt: string
}

type ListResponse = {
  items: StockMovement[]
  total: number
  page: number
  pageSize: number
}

const TYPE_COLORS: Record<string, string> = {
  PURCHASE: 'text-emerald-600',
  PRODUCTION_IN: 'text-brand-600',
  PRODUCTION_OUT: 'text-amber-600',
  ORDER_OUT: 'text-purple-600',
  MANUAL_ADJUST: 'text-blue-600',
  WASTE: 'text-red-500',
}

const TYPE_BG: Record<string, string> = {
  PURCHASE: 'bg-emerald-50 text-emerald-700',
  PRODUCTION_IN: 'bg-brand-50 text-brand-700',
  PRODUCTION_OUT: 'bg-amber-50 text-amber-700',
  ORDER_OUT: 'bg-purple-50 text-purple-700',
  MANUAL_ADJUST: 'bg-blue-50 text-blue-700',
  WASTE: 'bg-red-50 text-red-700',
}

const ENTITY_LABEL: Record<string, string> = {
  RAW_MATERIAL: 'Material',
  PRODUCT: 'Product',
  MENU_ITEM: 'Catalogue',
}

export default function StockMovementHistoryPage() {
  const { token } = useAuth()
  const t = useT()
  const { formatDateTime } = useFormatDate()
  const [searchParams] = useSearchParams()

  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [materialId] = useState<string>(searchParams.get('materialId') ?? '')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  const TYPE_LABELS: Record<string, string> = {
    PURCHASE: t('stockMovements_purchase'),
    PRODUCTION_IN: t('stockMovements_productionIn'),
    PRODUCTION_OUT: t('stockMovements_productionOut'),
    ORDER_OUT: t('stockMovements_orderOut'),
    MANUAL_ADJUST: t('stockMovements_manualAdjust'),
    WASTE: t('stockMovements_waste'),
  }

  const typeFilters = [
    { value: 'all', label: t('orders_filterAll') },
    { value: 'PURCHASE', label: t('stockMovements_purchase') },
    { value: 'PRODUCTION_OUT', label: t('stockMovements_productionOut') },
    { value: 'MANUAL_ADJUST', label: t('stockMovements_manualAdjust') },
    { value: 'WASTE', label: t('stockMovements_waste') },
  ]

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
    clearTimeout((handleSearchChange as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleSearchChange as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => setDebouncedSearch(value), 300)
  }

  const queryParams = new URLSearchParams()
  if (typeFilter !== 'all') queryParams.set('type', typeFilter)
  if (materialId) queryParams.set('materialId', materialId)
  if (debouncedSearch) queryParams.set('search', debouncedSearch)
  queryParams.set('page', String(page))
  const queryString = queryParams.toString()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['stockMovements', typeFilter, materialId, debouncedSearch, page],
    queryFn: () =>
      apiFetch<ListResponse>(
        `/api/v1/stock-movements?${queryString}`,
        { token },
      ),
    enabled: !!token,
  })

  const items = data?.items ?? []

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-6">
      {/* Mobile header */}
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <h1 className="text-base font-semibold text-gray-900 mb-2">{t('stockMovements_title')}</h1>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-2">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setTypeFilter(f.value); setPage(1) }}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors flex-shrink-0 ${
                typeFilter === f.value ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('stockMovements_title')}</h1>
        <div className="flex gap-2">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setTypeFilter(f.value); setPage(1) }}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                typeFilter === f.value ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name…"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </header>

      {/* Mobile list */}
      <div className="p-4 md:hidden">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !items.length && (
          <EmptyState title={t('stockMovements_emptyTitle')} description={t('stockMovements_emptyDesc')} />
        )}
        {!isLoading && !isError && !!items.length && (
          <ul className="space-y-2">
            {items.map((mv) => (
              <li key={mv.id} className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-medium text-gray-800 truncate">{mv.entityName ?? '—'}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0">
                        {ENTITY_LABEL[mv.entityType] ?? mv.entityType}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{formatDateTime(mv.createdAt)}</p>
                    {mv.notes && <p className="text-xs text-gray-500 italic mt-0.5">{mv.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${TYPE_COLORS[mv.type] ?? 'text-gray-700'}`}>
                      {formatDelta(parseFloat(mv.quantityDelta), mv.unit)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${TYPE_BG[mv.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[mv.type] ?? mv.type}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block px-6 py-5">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !items.length && (
          <EmptyState title={t('stockMovements_emptyTitle')} description={t('stockMovements_emptyDesc')} />
        )}
        {!isLoading && !isError && !!items.length && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Item</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t('stockMovements_type')}</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">{t('stockMovements_change')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t('stockMovements_notes')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">{t('stockMovements_date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((mv) => (
                  <tr key={mv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 text-sm">
                      {mv.entityName ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                        {ENTITY_LABEL[mv.entityType] ?? mv.entityType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BG[mv.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_LABELS[mv.type] ?? mv.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${TYPE_COLORS[mv.type] ?? 'text-gray-700'}`}>
                      {formatDelta(parseFloat(mv.quantityDelta), mv.unit)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{mv.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(mv.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
      </div>
    </div>
  )
}
