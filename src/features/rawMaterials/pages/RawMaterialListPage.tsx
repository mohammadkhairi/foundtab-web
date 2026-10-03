import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Joyride, type EventData, STATUS } from 'react-joyride'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { useOnboardingTour } from '../../onboarding/hooks/useOnboardingTour'

type RawMaterial = {
  id: string
  name: string
  baseUnit: string
  quantityOnHand: number
  reorderLevel: number | null
  unitCost: number | null
}

type ListResponse = {
  items: RawMaterial[]
  total: number
}

export default function RawMaterialListPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('rawMaterials')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: () =>
      apiFetch<ListResponse>('/api/v1/raw-materials', { token }),
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
          <h1 className="text-base font-semibold text-gray-900">Bahan Mentah</h1>
          <button
            data-tour="raw-material-add"
            onClick={() => navigate('/raw-materials/new')}
            className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center"
            aria-label="Tambah bahan mentah"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      <div className="p-4" data-tour="raw-material-list">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && (!data?.items.length) && (
          <EmptyState
            title="Tiada bahan mentah"
            description="Tambah bahan pertama anda untuk mula jejak inventori."
            actionLabel="Tambah bahan"
            onAction={() => navigate('/raw-materials/new')}
          />
        )}
        {!isLoading && !isError && !!data?.items.length && (
          <ul className="space-y-2">
            {data.items.map((item) => {
              const low = item.reorderLevel !== null && item.quantityOnHand <= item.reorderLevel
              return (
                <li key={item.id}>
                  <button
                    onClick={() => navigate(`/raw-materials/${item.id}/edit`)}
                    className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.quantityOnHand} {item.baseUnit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {low && (
                        <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                          Rendah
                        </span>
                      )}
                      {item.unitCost !== null && (
                        <span className="text-xs text-gray-400">
                          RM {item.unitCost.toFixed(2)}/{item.baseUnit}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
