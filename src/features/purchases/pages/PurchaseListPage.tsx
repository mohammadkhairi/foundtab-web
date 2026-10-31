import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
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

type Purchase = {
  id: string
  supplierName: string | null
  receiptDate: string | null
  totalAmount: string | null
  createdAt: string
}

type ListResponse = {
  items: Purchase[]
  total: number
  page: number
  pageSize: number
}

export default function PurchaseListPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const t = useT()
  const { formatDate: _formatDate } = useFormatDate()
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return _formatDate(dateStr)
  }
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('purchases')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    setHasDraft(!!localStorage.getItem('foundtab_ocr_draft'))
  }, [])

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  const params = new URLSearchParams()
  params.set('page', String(page))
  if (search) params.set('search', search)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchases', page, search],
    queryFn: () => apiFetch<ListResponse>(`/api/v1/purchases?${params}`, { token }),
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
          <h1 className="text-base font-semibold text-gray-900">{t('purchases_title')}</h1>
          <button
            data-tour="purchase-scan"
            onClick={() => navigate('/purchases/scan')}
            className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center"
            aria-label={t('purchases_scan')}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        <input
          type="text"
          placeholder={t('purchases_supplierPlaceholder')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('purchases_title')}</h1>
        <input
          type="text"
          placeholder={t('purchases_supplierPlaceholder')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          onClick={() => navigate('/purchases/new')}
          className="text-sm text-gray-600 border border-gray-200 px-4 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          + {t('common_add')}
        </button>
        <button
          data-tour="purchase-scan"
          onClick={() => navigate('/purchases/scan')}
          className="bg-sky-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-sky-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('purchases_scan')}
        </button>
      </header>

      {/* Resume draft banner */}
      {hasDraft && (
        <div className="mx-4 mb-2 md:mx-6 md:mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-800">Unfinished receipt scan</p>
            <p className="text-xs text-amber-600">You have a scan in progress. Resume where you left off.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { localStorage.removeItem('foundtab_ocr_draft'); setHasDraft(false) }}
              className="text-xs text-amber-500 hover:text-amber-700 px-2 py-1.5 rounded-lg transition-colors"
            >
              Discard
            </button>
            <button
              onClick={() => navigate('/purchases/scan')}
              className="text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Resume →
            </button>
          </div>
        </div>
      )}

      {/* Mobile list */}
      <div className="p-4 md:hidden" data-tour="purchase-list">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !items.length && (
          <EmptyState
            title={t('purchases_emptyTitle')}
            description={t('purchases_emptyDesc')}
            actionLabel={t('purchases_emptyAction')}
            onAction={() => navigate('/purchases/scan')}
          />
        )}
        {!isLoading && !isError && !!items.length && (
          <>
            <ul className="space-y-2">
              {items.map((purchase) => (
                <li key={purchase.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/purchases/${purchase.id}`)}
                    className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-card p-4 hover:border-sky-300 transition-colors active:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {purchase.supplierName ?? t('purchases_noSupplier')}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(purchase.receiptDate)}</p>
                      </div>
                      {purchase.totalAmount !== null && (
                        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          RM {parseFloat(purchase.totalAmount).toFixed(2)}
                        </p>
                      )}
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
            title={t('purchases_emptyTitle')}
            description={t('purchases_emptyDesc')}
            actionLabel={t('purchases_emptyAction')}
            onAction={() => navigate('/purchases/scan')}
          />
        )}
        {!isLoading && !isError && !!items.length && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('purchases_supplier')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('purchases_date')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">{t('purchases_totalAmount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((purchase) => (
                    <tr
                      key={purchase.id}
                      onClick={() => navigate(`/purchases/${purchase.id}`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {purchase.supplierName ?? <span className="text-gray-400">{t('purchases_noSupplier')}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(purchase.receiptDate)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                        {purchase.totalAmount !== null ? `RM ${parseFloat(purchase.totalAmount).toFixed(2)}` : '—'}
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

      <div className="fixed bottom-20 right-4 md:hidden">
        <button
          onClick={() => navigate('/purchases/new')}
          className="text-xs text-sky-600 bg-white border border-sky-200 rounded-full px-3 py-1.5 shadow-sm"
        >
          + {t('common_add')}
        </button>
      </div>
    </div>
  )
}
