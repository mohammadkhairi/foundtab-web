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
import ArchiveDialog from '../../../components/ArchiveDialog'
import { useOnboardingTour } from '../../onboarding/hooks/useOnboardingTour'
import { useT } from '../../../hooks/useT'
import RecordWastageModal from '../../wastage/components/RecordWastageModal'

const MS_PER_HOUR = 60 * 60 * 1000
const EXPIRY_WARN_HOURS = 24

type Product = {
  id: string
  name: string
  sku: string | null
  salePrice: string | null
  currentStockUnits: string
  unit: string
  isActive: boolean
  expiryDate: string | null
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return null
  const now = Date.now()
  const expiry = new Date(expiryDate).getTime()
  const isExpired = expiry < now
  const isExpiringSoon = !isExpired && expiry < now + EXPIRY_WARN_HOURS * MS_PER_HOUR
  if (isExpired) return <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Expired</span>
  if (isExpiringSoon) return <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Expiring soon</span>
  return null
}

type ListResponse = {
  items: Product[]
  total: number
  page: number
  pageSize: number
}

export default function ProductListPage() {
  const navigate = useNavigate()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const queryClient = useQueryClient()
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('products')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string; usageLines: string[] } | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [wastageProduct, setWastageProduct] = useState<Product | null>(null)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  async function openArchive(e: React.MouseEvent, product: Product) {
    e.stopPropagation()
    const freshToken = await refreshToken()
    if (!freshToken) return
    const usage = await apiFetch<{ plannedProductions: number; activeOrders: number }>(
      `/api/v1/products/${product.id}/usage`, { token: freshToken }
    )
    const lines: string[] = []
    if (usage.plannedProductions > 0) lines.push(`${usage.plannedProductions} planned production${usage.plannedProductions !== 1 ? 's' : ''}`)
    if (usage.activeOrders > 0) lines.push(`${usage.activeOrders} active order${usage.activeOrders !== 1 ? 's' : ''}`)
    setArchiveTarget({ id: product.id, name: product.name, usageLines: lines })
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget) return
    const freshToken = await refreshToken()
    if (!freshToken) return
    setArchiving(true)
    try {
      await apiFetch(`/api/v1/products/${archiveTarget.id}`, { method: 'DELETE', token: freshToken })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      setArchiveTarget(null)
    } finally {
      setArchiving(false)
    }
  }

  const params = new URLSearchParams()
  params.set('page', String(page))
  if (search) params.set('search', search)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => apiFetch<ListResponse>(`/api/v1/products?${params}`, { token }),
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
          <h1 className="text-base font-semibold text-gray-900">{t('products_title')}</h1>
          <button
            data-tour="product-add"
            onClick={() => navigate('/products/new')}
            className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center"
            aria-label={t('products_add')}
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <input
          type="text"
          placeholder={t('products_namePlaceholder')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('products_title')}</h1>
        <input
          type="text"
          placeholder={t('products_namePlaceholder')}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          data-tour="product-add"
          onClick={() => navigate('/products/new')}
          className="bg-brand-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-brand-600 transition-colors"
        >
          + {t('products_add')}
        </button>
      </header>

      {/* Mobile list */}
      <div className="p-4 md:hidden">
        {isLoading && <LoadingSpinner />}
        {isError && <ErrorState onRetry={() => void refetch()} />}
        {!isLoading && !isError && !items.length && (
          <EmptyState
            title={t('products_emptyTitle')}
            description={t('products_emptyDesc')}
            actionLabel={t('products_emptyAction')}
            onAction={() => navigate('/products/new')}
          />
        )}
        {!isLoading && !isError && !!items.length && (
          <>
            <ul className="space-y-2">
              {items.map((product) => (
                <li key={product.id}>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
                    <button
                      onClick={() => navigate(`/products/${product.id}/edit`)}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                          <ExpiryBadge expiryDate={product.expiryDate} />
                        </div>
                        {product.sku && (
                          <p className="text-xs text-gray-400 mt-0.5">SKU: {product.sku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {product.salePrice !== null && (
                          <p className="text-sm font-semibold text-gray-900">RM {parseFloat(product.salePrice).toFixed(2)}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {parseFloat(product.currentStockUnits)} {product.unit}
                        </p>
                      </div>
                    </button>
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => setWastageProduct(product)}
                        className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors px-2 py-1 rounded hover:bg-red-50"
                      >
                        Record wastage
                      </button>
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
            title={t('products_emptyTitle')}
            description={t('products_emptyDesc')}
            actionLabel={t('products_emptyAction')}
            onAction={() => navigate('/products/new')}
          />
        )}
        {!isLoading && !isError && !!items.length && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('products_name')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('products_sku')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">{t('products_salePrice')}</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">{t('rawMaterials_quantityOnHand')}</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">{t('products_unit')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((product) => (
                    <tr
                      key={product.id}
                      onClick={() => navigate(`/products/${product.id}/edit`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900">{product.name}</span>
                          <ExpiryBadge expiryDate={product.expiryDate} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{product.sku ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {product.salePrice !== null ? `RM ${parseFloat(product.salePrice).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {parseFloat(product.currentStockUnits)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{product.unit}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setWastageProduct(product)}
                            className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors px-2 py-1 rounded hover:bg-red-50"
                          >
                            Record wastage
                          </button>
                          <button
                            onClick={(e) => void openArchive(e, product)}
                            className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors px-2 py-1 rounded hover:bg-red-50"
                          >
                            Archive
                          </button>
                        </div>
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

      {archiveTarget && (
        <ArchiveDialog
          title={`Archive "${archiveTarget.name}"?`}
          description="The product will be hidden from active lists and cannot be selected for new orders or productions."
          usageLines={archiveTarget.usageLines}
          onConfirm={() => void handleArchiveConfirm()}
          onCancel={() => setArchiveTarget(null)}
          confirming={archiving}
        />
      )}

      {wastageProduct && (
        <RecordWastageModal
          preselectedProduct={wastageProduct}
          onClose={() => setWastageProduct(null)}
          onSuccess={() => {
            setWastageProduct(null)
            void queryClient.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      )}
    </div>
  )
}
