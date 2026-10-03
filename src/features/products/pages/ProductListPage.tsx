import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Joyride, type EventData, STATUS } from 'react-joyride'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { useOnboardingTour } from '../../onboarding/hooks/useOnboardingTour'

type Product = {
  id: string
  name: string
  sku: string | null
  salePrice: number | null
  finishedGoodsOnHand: number
  finishedGoodsUnit: string
}

type ListResponse = {
  items: Product[]
  total: number
}

export default function ProductListPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('products')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiFetch<ListResponse>('/api/v1/products', { token }),
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
          <h1 className="text-base font-semibold text-gray-900">Produk</h1>
          <button
            data-tour="product-add"
            onClick={() => navigate('/products/new')}
            className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center"
            aria-label="Tambah produk"
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
            title="Tiada produk"
            description="Tambah produk pertama anda dan bina resepinya."
            actionLabel="Tambah produk"
            onAction={() => navigate('/products/new')}
          />
        )}
        {!isLoading && !isError && !!data?.items.length && (
          <ul className="space-y-2">
            {data.items.map((product) => (
              <li key={product.id}>
                <button
                  onClick={() => navigate(`/products/${product.id}/edit`)}
                  className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    {product.sku && (
                      <p className="text-xs text-gray-400 mt-0.5">SKU: {product.sku}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {product.salePrice !== null && (
                      <p className="text-sm font-semibold text-gray-900">RM {product.salePrice.toFixed(2)}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {product.finishedGoodsOnHand} {product.finishedGoodsUnit} siap
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
