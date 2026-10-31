import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Joyride, type EventData, STATUS } from 'react-joyride'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'
import Pagination from '../../../components/Pagination'
import { formatQty } from '../../../lib/units'
import { useOnboardingTour } from '../../onboarding/hooks/useOnboardingTour'
import { useT } from '../../../hooks/useT'

type RawMaterial = {
  id: string
  name: string
  baseUnit: string
  currentStockBaseUnit: string
  lowThresholdBaseUnit: string | null
  isActive: boolean
}

type ListResponse = {
  items: RawMaterial[]
  total: number
  page: number
  pageSize: number
}

export default function RawMaterialListPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const t = useT()
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('rawMaterials')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  const params = new URLSearchParams()
  params.set('page', String(page))
  if (search) params.set('search', search)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rawMaterials', page, search],
    queryFn: () => apiFetch<ListResponse>(`/api/v1/raw-materials?${params}`, { token }),
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
          <h1 className="text-base font-semibold text-gray-900">{t('rawMaterials_title')}</h1>
          <button
            data-tour="raw-material-add"
            onClick={() => navigate('/raw-materials/new')}
            className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center"
            aria-label={t('rawMaterials_add')}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <input
          type="text"
          placeholder={t('rawMaterials_namePlaceholder')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('rawMaterials_title')}</h1>
        <input
          type="text"
          placeholder={t('rawMaterials_namePlaceholder')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          data-tour="raw-material-add"
          onClick={() => navigate('/raw-materials/new')}
          className="bg-brand-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-brand-600 transition-colors whitespace-nowrap"
        >
          + {t('rawMaterials_add')}
        </button>
      </header>

      {/* Mobile list */}
      <div className="p-4 md:hidden" data-tour="raw-material-list">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !items.length && (
          <EmptyState
            title={t('rawMaterials_emptyTitle')}
            description={t('rawMaterials_emptyDesc')}
            actionLabel={t('rawMaterials_emptyAction')}
            onAction={() => navigate('/raw-materials/new')}
          />
        )}
        {!isLoading && !isError && !!items.length && (
          <>
            <ul className="space-y-2">
              {items.map((item) => {
                const qty = parseFloat(item.currentStockBaseUnit) || 0
                const threshold = item.lowThresholdBaseUnit !== null ? parseFloat(item.lowThresholdBaseUnit) : null
                const low = threshold !== null && qty <= threshold
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => navigate(`/raw-materials/${item.id}/edit`)}
                      className="w-full bg-white rounded-2xl border border-gray-100 shadow-card p-4 flex items-center gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatQty(qty, item.baseUnit)}
                        </p>
                      </div>
                      {low && (
                        <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                          {t('rawMaterials_low')}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
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
            title={t('rawMaterials_emptyTitle')}
            description={t('rawMaterials_emptyDesc')}
            actionLabel={t('rawMaterials_emptyAction')}
            onAction={() => navigate('/raw-materials/new')}
          />
        )}
        {!isLoading && !isError && !!items.length && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('rawMaterials_name')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500" colSpan={2}>{t('rawMaterials_quantityOnHand')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">{t('rawMaterials_reorderLevel')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => {
                    const qty = parseFloat(item.currentStockBaseUnit) || 0
                    const threshold = item.lowThresholdBaseUnit !== null ? parseFloat(item.lowThresholdBaseUnit) : null
                    const low = threshold !== null && qty <= threshold
                    return (
                      <tr
                        key={item.id}
                        onClick={() => navigate(`/raw-materials/${item.id}/edit`)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700" colSpan={2}>{formatQty(qty, item.baseUnit)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-400">
                          {threshold !== null ? formatQty(threshold, item.baseUnit) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {low && (
                              <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                                {t('rawMaterials_low')}
                              </span>
                            )}
                            <span className="text-xs text-brand-500 font-medium px-2 py-1">
                              {t('common_edit')}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
