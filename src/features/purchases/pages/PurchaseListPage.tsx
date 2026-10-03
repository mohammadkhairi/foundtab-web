import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Joyride, type EventData, STATUS } from 'react-joyride'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { useOnboardingTour } from '../../onboarding/hooks/useOnboardingTour'

type Purchase = {
  id: string
  merchant: string | null
  date: string | null
  totalAmount: number | null
  createdAt: string
}

type ListResponse = {
  items: Purchase[]
  total: number
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function PurchaseListPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('purchases')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => apiFetch<ListResponse>('/api/v1/purchases', { token }),
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
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Pembelian</h1>
          <button
            data-tour="purchase-scan"
            onClick={() => navigate('/purchases/scan')}
            className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center"
            aria-label="Imbas resit"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="p-4" data-tour="purchase-list">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !data?.items.length && (
          <EmptyState
            title="Tiada rekod pembelian"
            description="Imbas resit pertama anda untuk mula jejak kos pembelian."
            actionLabel="Imbas resit"
            onAction={() => navigate('/purchases/scan')}
          />
        )}
        {!isLoading && !isError && !!data?.items.length && (
          <ul className="space-y-2">
            {data.items.map((purchase) => (
              <li key={purchase.id}>
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {purchase.merchant ?? 'Tanpa nama'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(purchase.date)}</p>
                    </div>
                    {purchase.totalAmount !== null && (
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        RM {purchase.totalAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="fixed bottom-20 right-4">
        <button
          onClick={() => navigate('/purchases/new')}
          className="text-xs text-sky-600 bg-white border border-sky-200 rounded-full px-3 py-1.5 shadow-sm"
        >
          + Manual
        </button>
      </div>
    </div>
  )
}
