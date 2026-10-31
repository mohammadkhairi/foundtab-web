import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorState from '../../../components/ErrorState'
import Pagination from '../../../components/Pagination'
import { useT } from '../../../hooks/useT'

type MenuItemComponent = { productId: string; quantity: string }
type MenuItem = { id: string; name: string; price: string; components: MenuItemComponent[] }

type ListResponse = {
  items: MenuItem[]
  total: number
  page: number
  pageSize: number
}

export default function MenuListPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const t = useT()
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['menu', page],
    queryFn: () => apiFetch<ListResponse>(`/api/v1/menu?page=${page}`, { token }),
    enabled: !!token,
  })

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  const items = data?.items ?? []

  function typeLabel(components: MenuItemComponent[]) {
    if (components.length === 0) return ''
    const uniqueProducts = new Set(components.map((c) => c.productId))
    const totalQty = components.reduce((sum, c) => sum + parseFloat(c.quantity), 0)
    if (uniqueProducts.size === 1 && totalQty === 1) return 'Single'
    if (uniqueProducts.size === 1) return `Pack of ${totalQty}`
    return 'Set'
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <h1 className="text-base font-semibold text-gray-900">{t('nav_catalogue')}</h1>
      </header>

      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('nav_catalogue')}</h1>
        <button
          onClick={() => navigate('/catalogue/new')}
          className="bg-sky-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm hover:bg-sky-600 transition-colors"
        >
          + Add item
        </button>
      </header>

      <div className="md:px-6 md:py-5">
        <div className="p-4 md:p-0 space-y-3">
          {items.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
              <p className="text-sm font-medium text-gray-500 mb-1">No catalogue items yet</p>
              <p className="text-xs text-gray-400 mb-4">Add your product bundles and sets here.</p>
              <button
                onClick={() => navigate('/catalogue/new')}
                className="bg-sky-500 text-white font-semibold px-4 py-2 rounded-lg text-sm"
              >
                Add first item
              </button>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/catalogue/${item.id}/edit`)}
                className="w-full bg-white rounded-xl border border-gray-100 shadow-card p-4 text-left hover:border-sky-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {typeLabel(item.components)} · {item.components.length} product{item.components.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">RM {parseFloat(item.price).toFixed(2)}</p>
                </div>
              </button>
            ))
          )}

          {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}

          <button
            onClick={() => navigate('/catalogue/new')}
            className="md:hidden w-full border-2 border-dashed border-sky-300 rounded-xl py-3 text-sky-600 text-sm font-medium"
          >
            + Add item
          </button>
        </div>
      </div>
    </div>
  )
}
