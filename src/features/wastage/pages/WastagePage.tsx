import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'
import Pagination from '../../../components/Pagination'
import { useT } from '../../../hooks/useT'
import RecordWastageModal from '../components/RecordWastageModal'

type WastageLog = {
  id: string
  entityType: 'PRODUCT' | 'RAW_MATERIAL'
  entityId: string
  entityName: string
  quantityBaseUnit: string
  unit: string
  reason: 'EXPIRED' | 'DAMAGED' | 'OTHER'
  notes: string | null
  estimatedValueMyr: string | null
  createdAt: string
}

type ListResponse = {
  items: WastageLog[]
  total: number
  page: number
  pageSize: number
}

type WastageStats = {
  totalEntriesLast30Days: number
  totalValueMyr: number
  byReason: {
    EXPIRED: number
    DAMAGED: number
    OTHER: number
  }
}

const REASON_STYLES: Record<string, string> = {
  EXPIRED: 'text-red-600 bg-red-50',
  DAMAGED: 'text-amber-600 bg-amber-50',
  OTHER: 'text-gray-600 bg-gray-100',
}

export default function WastagePage() {
  const { token } = useAuth()
  const t = useT()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['wastage-stats'],
    queryFn: () => apiFetch<WastageStats>('/api/v1/wastage/stats', { token }),
    enabled: !!token,
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['wastage', page],
    queryFn: () => apiFetch<ListResponse>(`/api/v1/wastage?page=${page}`, { token }),
    enabled: !!token,
  })

  function handleSuccess() {
    setShowModal(false)
    void queryClient.invalidateQueries({ queryKey: ['wastage'] })
    void queryClient.invalidateQueries({ queryKey: ['wastage-stats'] })
    void queryClient.invalidateQueries({ queryKey: ['products'] })
    void queryClient.invalidateQueries({ queryKey: ['raw-materials-all'] })
  }

  function reasonLabel(reason: string): string {
    if (reason === 'EXPIRED') return t('wastage_reason_EXPIRED')
    if (reason === 'DAMAGED') return t('wastage_reason_DAMAGED')
    return t('wastage_reason_OTHER')
  }

  const items = data?.items ?? []
  const totalExpired = stats?.byReason?.EXPIRED ?? 0
  const totalEntries = stats?.totalEntriesLast30Days ?? 0
  const expiredPct = totalEntries > 0 ? Math.round((totalExpired / totalEntries) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-6">
      {/* Mobile header */}
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">{t('wastage_title')}</h1>
          <button
            onClick={() => setShowModal(true)}
            className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center"
            aria-label={t('wastage_recordWastage')}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      {/* Desktop header */}
      <div className="hidden md:block px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">{t('wastage_title')}</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors"
          >
            + {t('wastage_recordWastage')}
          </button>
        </div>
      </div>

      {/* Stats row */}
      {!statsLoading && stats && (
        <div className="px-4 md:px-6 mb-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('wastage_statsLast30Days')}</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-gray-700">
                <strong className="text-gray-900">{stats.totalEntriesLast30Days}</strong> {t('wastage_entries')}
              </span>
              <span className="text-gray-700">
                <strong className="text-gray-900">RM {stats.totalValueMyr.toFixed(2)}</strong> {t('wastage_wasted')}
              </span>
              {expiredPct > 0 && (
                <span className="text-red-600">
                  <strong>{expiredPct}%</strong> {t('wastage_expired')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="px-4 md:px-6">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !items.length && (
          <EmptyState
            title={t('wastage_noEntries')}
            description=""
            actionLabel={t('wastage_recordWastage')}
            onAction={() => setShowModal(true)}
          />
        )}
        {!isLoading && !isError && !!items.length && (
          <>
            {/* Mobile list */}
            <ul className="space-y-2 md:hidden">
              {items.map((log) => (
                <li key={log.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{log.entityName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {parseFloat(log.quantityBaseUnit)} {log.unit}
                        {log.estimatedValueMyr && (
                          <> · RM {parseFloat(log.estimatedValueMyr).toFixed(2)}</>
                        )}
                      </p>
                      {log.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{log.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${REASON_STYLES[log.reason] ?? ''}`}>
                        {reasonLabel(log.reason)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Item</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Qty</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('wastage_reason')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Est. value</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{log.entityName}</p>
                        {log.notes && <p className="text-xs text-gray-400 italic">{log.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {parseFloat(log.quantityBaseUnit)} {log.unit}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${REASON_STYLES[log.reason] ?? ''}`}>
                          {reasonLabel(log.reason)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {log.estimatedValueMyr ? `RM ${parseFloat(log.estimatedValueMyr).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
          </>
        )}
      </div>

      {showModal && (
        <RecordWastageModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
