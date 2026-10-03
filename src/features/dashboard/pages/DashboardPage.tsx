import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Joyride, type EventData, STATUS } from 'react-joyride'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorState from '../../../components/ErrorState'
import SetupChecklist from '../../onboarding/components/SetupChecklist'
import { useOnboardingTour } from '../../onboarding/hooks/useOnboardingTour'

type DashboardSummary = {
  totalRevenue: number
  totalOrders: number
  pendingOrders: number
  totalCogs: number
  grossProfit: number
  grossMargin: number
}

type StockItem = {
  id: string
  name: string
  quantityOnHand: number
  baseUnit: string
  reorderLevel: number | null
  isLow: boolean
}

type FinishedGoodsItem = {
  id: string
  name: string
  finishedGoodsOnHand: number
  finishedGoodsUnit: string
  salePrice: number | null
}

type DashboardResponse = {
  summary: DashboardSummary
  stock: StockItem[]
  finishedGoods: FinishedGoodsItem[]
  showChecklist: boolean
}

type Tab = 'overview' | 'stock' | 'goods'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('dashboard')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardResponse>('/api/v1/dashboard', { token }),
    enabled: !!token,
  })

  function handleTourCallback(cbData: EventData) {
    const finished = ([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(cbData.status)
    if (finished) onTourFinish()
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  const { summary, stock, finishedGoods, showChecklist } = data ?? {
    summary: { totalRevenue: 0, totalOrders: 0, pendingOrders: 0, totalCogs: 0, grossProfit: 0, grossMargin: 0 },
    stock: [],
    finishedGoods: [],
    showChecklist: false,
  }

  const lowStockCount = stock.filter((s) => s.isLow).length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Joyride
        steps={steps}
        run={shouldRun}
        continuous
        onEvent={handleTourCallback}
      />

      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-semibold text-gray-900">Papan pemuka</h1>
          {lowStockCount > 0 && (
            <button
              onClick={() => setTab('stock')}
              className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
              {lowStockCount} stok rendah
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTab('overview')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${tab === 'overview' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Ringkasan
          </button>
          <button
            onClick={() => setTab('stock')}
            data-tour="dashboard-stock-tab"
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${tab === 'stock' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Stok
          </button>
          <button
            onClick={() => setTab('goods')}
            data-tour="dashboard-goods-tab"
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${tab === 'goods' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Barangan siap
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4" data-tour="dashboard-summary">
        {showChecklist && <SetupChecklist />}

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Jualan bulan ini</p>
                <p className="text-xl font-bold text-gray-900 mt-1">RM {summary.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Keuntungan kasar</p>
                <p className={`text-xl font-bold mt-1 ${summary.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  RM {summary.grossProfit.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Pesanan</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{summary.totalOrders}</p>
                {summary.pendingOrders > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5">{summary.pendingOrders} menunggu</p>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Margin</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{summary.grossMargin.toFixed(1)}%</p>
              </div>
            </div>

            {summary.pendingOrders > 0 && (
              <button
                onClick={() => navigate('/orders')}
                className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left"
              >
                <p className="text-sm font-medium text-amber-800">
                  {summary.pendingOrders} pesanan menunggu tindakan
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Ketik untuk lihat pesanan</p>
              </button>
            )}
          </>
        )}

        {tab === 'stock' && (
          <StockTab items={stock} onNavigate={() => navigate('/stock-movements')} />
        )}

        {tab === 'goods' && (
          <FinishedGoodsTab items={finishedGoods} onNavigate={() => navigate('/productions/new')} />
        )}
      </div>
    </div>
  )
}

function StockTab({ items, onNavigate }: { items: StockItem[]; onNavigate: () => void }) {
  const lowItems = items.filter((s) => s.isLow)
  const okItems = items.filter((s) => !s.isLow)

  return (
    <div className="space-y-4">
      {lowItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Stok rendah</p>
          <ul className="space-y-2">
            {lowItems.map((item) => (
              <li key={item.id} className="bg-white rounded-2xl border border-red-200 p-4 flex justify-between">
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-sm font-medium text-red-600">{item.quantityOnHand} {item.baseUnit}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {okItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stok mencukupi</p>
          <ul className="space-y-2">
            {okItems.map((item) => (
              <li key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex justify-between">
                <p className="text-sm text-gray-800">{item.name}</p>
                <p className="text-sm text-gray-600">{item.quantityOnHand} {item.baseUnit}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">Tiada rekod stok.</p>
      )}
      <button onClick={onNavigate} className="text-xs text-sky-600 font-medium">
        Lihat sejarah pergerakan stok →
      </button>
    </div>
  )
}

function FinishedGoodsTab({ items, onNavigate }: { items: FinishedGoodsItem[]; onNavigate: () => void }) {
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Tiada rekod barangan siap.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  {item.salePrice !== null && (
                    <p className="text-xs text-gray-400 mt-0.5">RM {item.salePrice.toFixed(2)} seunit</p>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {item.finishedGoodsOnHand} {item.finishedGoodsUnit}
                </p>
              </div>
              {item.salePrice !== null && (
                <p className="text-xs text-emerald-600 mt-1">
                  Nilai: RM {(item.finishedGoodsOnHand * item.salePrice).toFixed(2)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <button onClick={onNavigate} className="text-xs text-sky-600 font-medium">
        Log pengeluaran baru →
      </button>
    </div>
  )
}
