import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Joyride, type EventData, STATUS } from 'react-joyride'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { useOnboardingTour } from '../../onboarding/hooks/useOnboardingTour'

type ProductionRecord = {
  id: string
  productName: string
  quantity: number
  finishedGoodsUnit: string
  totalCost: number | null
  notes: string | null
  createdAt: string
}

type ListResponse = {
  items: ProductionRecord[]
  total: number
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ms-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ProductionHistoryPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('productions')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['productions'],
    queryFn: () => apiFetch<ListResponse>('/api/v1/productions', { token }),
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
          <h1 className="text-base font-semibold text-gray-900" data-tour="production-history">
            Sejarah pengeluaran
          </h1>
          <button
            onClick={() => navigate('/productions/new')}
            className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center"
            aria-label="Log pengeluaran baru"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      <div className="p-4">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !data?.items.length && (
          <EmptyState
            title="Tiada rekod pengeluaran"
            description="Log pengeluaran pertama anda untuk jejak kos dan stok siap."
            actionLabel="Log pengeluaran"
            onAction={() => navigate('/productions/new')}
          />
        )}
        {!isLoading && !isError && !!data?.items.length && (
          <ul className="space-y-2">
            {data.items.map((record) => (
              <li key={record.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{record.productName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(record.createdAt)}</p>
                    {record.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">{record.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {record.quantity} {record.finishedGoodsUnit}
                    </p>
                    {record.totalCost !== null && (
                      <p className="text-xs text-gray-400">RM {record.totalCost.toFixed(2)}</p>
                    )}
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
