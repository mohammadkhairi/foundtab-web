import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Joyride, type EventData, STATUS } from 'react-joyride'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'
import Pagination from '../../../components/Pagination'
import { useOnboardingTour } from '../../onboarding/hooks/useOnboardingTour'
import { useT } from '../../../hooks/useT'
import { useFormatDate } from '../../../hooks/useFormatDate'

type ProductionRecord = {
  id: string
  recipeId: string
  batchCount: string
  status: string
  notes: string | null
  createdAt: string
}

type ListResponse = {
  items: ProductionRecord[]
  total: number
  page: number
  pageSize: number
}

const STATUS_BG: Record<string, string> = {
  PLANNED: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-600',
}

export default function ProductionHistoryPage() {
  const navigate = useNavigate()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const { formatDateTime } = useFormatDate()
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('productions')
  const queryClient = useQueryClient()
  const [completing, setCompleting] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  async function handleComplete(productionId: string) {
    const freshToken = await refreshToken()
    if (!freshToken) return
    setCompleting(productionId)
    try {
      await apiFetch(`/api/v1/productions/${productionId}/complete`, { method: 'POST', token: freshToken })
      void queryClient.invalidateQueries({ queryKey: ['productions'] })
      void queryClient.invalidateQueries({ queryKey: ['rawMaterials'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    } finally {
      setCompleting(null)
    }
  }

  const STATUS_LABELS: Record<string, string> = {
    PLANNED: t('productions_planned'),
    COMPLETED: t('productions_completed'),
    CANCELLED: t('productions_cancelled'),
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['productions', page],
    queryFn: () => apiFetch<ListResponse>(`/api/v1/productions?page=${page}`, { token }),
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
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900" data-tour="production-history">
            {t('productions_title')}
          </h1>
          <button
            onClick={() => navigate('/productions/new')}
            className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center"
            aria-label={t('productions_add')}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-900 flex-1" data-tour="production-history">
          {t('productions_title')}
        </h1>
        <button
          onClick={() => navigate('/productions/new')}
          className="bg-sky-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-sky-600 transition-colors"
        >
          + {t('productions_add')}
        </button>
      </header>

      {/* Mobile list */}
      <div className="p-4 md:hidden">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !items.length && (
          <EmptyState
            title={t('productions_emptyTitle')}
            description={t('productions_emptyDesc')}
            actionLabel={t('productions_emptyAction')}
            onAction={() => navigate('/productions/new')}
          />
        )}
        {!isLoading && !isError && !!items.length && (
          <>
            <ul className="space-y-2">
              {items.map((record) => (
                <li key={record.id} className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDateTime(record.createdAt)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${STATUS_BG[record.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[record.status] ?? record.status}
                      </span>
                      {record.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">{record.notes}</p>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {parseFloat(record.batchCount)} {t('productions_batches')}
                      </p>
                      {record.status === 'PLANNED' && (
                        <button
                          onClick={() => void handleComplete(record.id)}
                          disabled={completing === record.id}
                          className="text-xs bg-emerald-500 text-white font-medium px-3 py-1 rounded-lg disabled:opacity-60 hover:bg-emerald-600 transition-colors"
                        >
                          {completing === record.id ? '...' : t('productions_complete')}
                        </button>
                      )}
                    </div>
                  </div>
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
            title={t('productions_emptyTitle')}
            description={t('productions_emptyDesc')}
            actionLabel={t('productions_emptyAction')}
            onAction={() => navigate('/productions/new')}
          />
        )}
        {!isLoading && !isError && !!items.length && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('productions_date')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('stockMovements_type')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">{t('productions_batches')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('productions_notes')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(record.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BG[record.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[record.status] ?? record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                        {parseFloat(record.batchCount)} {t('productions_batches')}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{record.notes ?? '—'}</td>
                      <td className="px-4 py-3">
                        {record.status === 'PLANNED' && (
                          <button
                            onClick={() => void handleComplete(record.id)}
                            disabled={completing === record.id}
                            className="text-xs bg-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg disabled:opacity-60 hover:bg-emerald-600 transition-colors"
                          >
                            {completing === record.id ? '...' : t('productions_complete')}
                          </button>
                        )}
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
    </div>
  )
}
