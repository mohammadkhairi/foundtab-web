import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Joyride, type EventData, STATUS } from 'react-joyride'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorState from '../../../components/ErrorState'
import Pagination from '../../../components/Pagination'
import SetupChecklist from '../../onboarding/components/SetupChecklist'
import { useOnboardingTour } from '../../onboarding/hooks/useOnboardingTour'
import { useT } from '../../../hooks/useT'
import type { TranslationKey } from '../../../i18n/translations'
import { formatQty } from '../../../lib/units'

const PAGE_SIZE = 10

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

type ChecklistStatus = {
  hasRawMaterials: boolean
  hasProducts: boolean
  hasRecipes: boolean
}

type DashboardTargets = {
  salesDaily: number | null
  salesMonthly: number | null
  purchasesDaily: number | null
  purchasesMonthly: number | null
}

type DashboardResponse = {
  daily: { sales: number; purchases: number; grossProfit: number }
  monthly: { sales: number; purchases: number; grossProfit: number; totalOrders: number; pendingOrders: number; grossMargin: number }
  values: { readyStockValue: number; rawMaterialValue: number }
  targets: DashboardTargets
  stock: StockItem[]
  finishedGoods: FinishedGoodsItem[]
  showChecklist: boolean
  checklistStatus: ChecklistStatus
}

type Tab = 'overview' | 'targets' | 'stock' | 'goods'

const EMPTY_DATA: DashboardResponse = {
  daily: { sales: 0, purchases: 0, grossProfit: 0 },
  monthly: { sales: 0, purchases: 0, grossProfit: 0, totalOrders: 0, pendingOrders: 0, grossMargin: 0 },
  values: { readyStockValue: 0, rawMaterialValue: 0 },
  targets: { salesDaily: null, salesMonthly: null, purchasesDaily: null, purchasesMonthly: null },
  stock: [],
  finishedGoods: [],
  showChecklist: false,
  checklistStatus: { hasRawMaterials: false, hasProducts: false, hasRecipes: false },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const t = useT()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')
  const { steps, shouldRun, onTourFinish } = useOnboardingTour('dashboard')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardResponse>('/api/v1/dashboard', { token }),
    enabled: !!token,
  })

  const d = data ?? EMPTY_DATA
  const lowStockCount = d.stock.filter((s) => s.isLow).length

  function handleTourCallback(cbData: EventData) {
    const finished = ([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(cbData.status)
    if (finished) onTourFinish()
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <Joyride steps={steps} run={shouldRun} continuous onEvent={handleTourCallback} />

      {/* Mobile header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-semibold text-gray-900">{t('dashboard_title')}</h1>
          {lowStockCount > 0 && (
            <button
              onClick={() => setTab('stock')}
              className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
              {t('dashboard_lowStockBadge').replace('{n}', String(lowStockCount))}
            </button>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {(['overview', 'targets', 'stock', 'goods'] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
                tab === tabKey ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tabKey === 'overview'
                ? t('dashboard_overview')
                : tabKey === 'targets'
                ? t('dashboard_tabTargets')
                : tabKey === 'stock'
                ? t('dashboard_stock')
                : t('dashboard_finishedGoods')}
            </button>
          ))}
        </div>
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('dashboard_title')}</h1>
        {lowStockCount > 0 && (
          <button
            onClick={() => navigate('/stock-movements')}
            className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
            </svg>
            {t('dashboard_lowStockBadge').replace('{n}', String(lowStockCount))}
          </button>
        )}
      </header>

      {/* Mobile content */}
      <div className="md:hidden p-4 space-y-4" data-tour="dashboard-summary">
        {d.showChecklist && <SetupChecklist status={d.checklistStatus} />}
        {tab === 'overview' && <MobileOverview d={d} navigate={navigate} t={t} />}
        {tab === 'targets' && (
          <TargetsSection
            targets={d.targets}
            daily={d.daily}
            monthly={d.monthly}
            token={token}
            onSaved={() => void qc.invalidateQueries({ queryKey: ['dashboard'] })}
            t={t}
          />
        )}
        {tab === 'stock' && <StockList items={d.stock} onNavigate={() => navigate('/stock-movements')} t={t} />}
        {tab === 'goods' && <FinishedGoodsList items={d.finishedGoods} onNavigate={() => navigate('/productions/new')} t={t} />}
      </div>

      {/* Desktop content */}
      <div className="hidden md:block p-6 space-y-6" data-tour="dashboard-summary">
        {d.showChecklist && (
          <div className="max-w-2xl">
            <SetupChecklist status={d.checklistStatus} />
          </div>
        )}

        {/* Pending orders banner */}
        {d.monthly.pendingOrders > 0 && (
          <button
            onClick={() => navigate('/orders')}
            className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-left flex items-center justify-between"
          >
            <p className="text-sm font-medium text-amber-800">
              {t('dashboard_pendingAction').replace('{n}', String(d.monthly.pendingOrders))}
            </p>
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Row 1: Daily + Monthly metrics */}
        <div className="grid grid-cols-3 gap-4">
          <MetricPair
            label={t('dashboard_dailySales')}
            dailyValue={d.daily.sales}
            monthlyLabel={t('dashboard_monthlySales')}
            monthlyValue={d.monthly.sales}
            color="sky"
          />
          <MetricPair
            label={t('dashboard_dailyPurchases')}
            dailyValue={d.daily.purchases}
            monthlyLabel={t('dashboard_monthlyPurchases')}
            monthlyValue={d.monthly.purchases}
            color="violet"
          />
          <MetricPair
            label={t('dashboard_dailyGrossProfit')}
            dailyValue={d.daily.grossProfit}
            monthlyLabel={t('dashboard_monthlyGrossProfit')}
            monthlyValue={d.monthly.grossProfit}
            color="emerald"
            signed
          />
        </div>

        {/* Row 2: Value cards */}
        <div className="grid grid-cols-4 gap-4">
          <ValueCard label={t('dashboard_readyStockValue')} value={d.values.readyStockValue} color="emerald" />
          <ValueCard label={t('dashboard_rawMaterialValue')} value={d.values.rawMaterialValue} color="sky" />
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 font-medium">{t('dashboard_orders')}</p>
            <p className="text-2xl font-bold mt-1.5 text-gray-900">{d.monthly.totalOrders}</p>
            {d.monthly.pendingOrders > 0 && (
              <p className="text-xs text-amber-600 mt-0.5">{d.monthly.pendingOrders} {t('dashboard_pending')}</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 font-medium">{t('dashboard_margin')}</p>
            <p className="text-2xl font-bold mt-1.5 text-gray-900">{d.monthly.grossMargin.toFixed(1)}%</p>
          </div>
        </div>

        {/* Row 3: Targets */}
        <TargetsSection
          targets={d.targets}
          daily={d.daily}
          monthly={d.monthly}
          token={token}
          onSaved={() => void qc.invalidateQueries({ queryKey: ['dashboard'] })}
          t={t}
        />

        {/* Row 4: Stock + Finished goods tables */}
        <div className="grid grid-cols-2 gap-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">{t('dashboard_stock')}</h2>
              <button onClick={() => navigate('/stock-movements')} className="text-xs text-sky-600 font-medium hover:underline">
                {t('dashboard_viewStockHistory')}
              </button>
            </div>
            <DesktopStockTable items={d.stock} t={t} />
          </section>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">{t('dashboard_finishedGoods')}</h2>
              <button onClick={() => navigate('/productions/new')} className="text-xs text-sky-600 font-medium hover:underline">
                {t('dashboard_logNewProduction')}
              </button>
            </div>
            <DesktopFinishedGoodsTable items={d.finishedGoods} t={t} />
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Targets section ─────────────────────────────────────────────────────────

type TargetsSectionProps = {
  targets: DashboardTargets
  daily: { sales: number; purchases: number }
  monthly: { sales: number; purchases: number }
  token: string | null | undefined
  onSaved: () => void
  t: (key: TranslationKey) => string
}

function TargetsSection({ targets, daily, monthly, token, onSaved, t }: TargetsSectionProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    salesDaily: targets.salesDaily !== null ? String(targets.salesDaily) : '',
    salesMonthly: targets.salesMonthly !== null ? String(targets.salesMonthly) : '',
    purchasesDaily: targets.purchasesDaily !== null ? String(targets.purchasesDaily) : '',
    purchasesMonthly: targets.purchasesMonthly !== null ? String(targets.purchasesMonthly) : '',
  })

  const { mutate, isPending, error } = useMutation({
    mutationFn: (payload: DashboardTargets) =>
      apiFetch('/api/v1/targets', {
        method: 'PUT',
        token: token ?? undefined,
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setEditing(false)
      onSaved()
    },
  })

  function handleSave() {
    mutate({
      salesDaily: form.salesDaily ? parseFloat(form.salesDaily) : null,
      salesMonthly: form.salesMonthly ? parseFloat(form.salesMonthly) : null,
      purchasesDaily: form.purchasesDaily ? parseFloat(form.purchasesDaily) : null,
      purchasesMonthly: form.purchasesMonthly ? parseFloat(form.purchasesMonthly) : null,
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">{t('dashboard_targets')}</h2>
        <button
          onClick={() => {
            setForm({
              salesDaily: targets.salesDaily !== null ? String(targets.salesDaily) : '',
              salesMonthly: targets.salesMonthly !== null ? String(targets.salesMonthly) : '',
              purchasesDaily: targets.purchasesDaily !== null ? String(targets.purchasesDaily) : '',
              purchasesMonthly: targets.purchasesMonthly !== null ? String(targets.purchasesMonthly) : '',
            })
            setEditing(true)
          }}
          className="text-xs text-sky-600 font-medium hover:underline"
        >
          {targets.salesDaily === null && targets.salesMonthly === null
            ? t('dashboard_setTargets')
            : t('dashboard_editTargets')}
        </button>
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TargetInput label={t('dashboard_salesDailyTarget')} value={form.salesDaily} onChange={(v) => setForm((f) => ({ ...f, salesDaily: v }))} />
            <TargetInput label={t('dashboard_salesMonthlyTarget')} value={form.salesMonthly} onChange={(v) => setForm((f) => ({ ...f, salesMonthly: v }))} />
            <TargetInput label={t('dashboard_purchasesDailyTarget')} value={form.purchasesDaily} onChange={(v) => setForm((f) => ({ ...f, purchasesDaily: v }))} />
            <TargetInput label={t('dashboard_purchasesMonthlyTarget')} value={form.purchasesMonthly} onChange={(v) => setForm((f) => ({ ...f, purchasesMonthly: v }))} />
          </div>
          {error && <p className="text-xs text-red-600">Failed to save targets.</p>}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-sky-600 disabled:opacity-40 transition-colors"
            >
              {isPending ? '...' : t('dashboard_saveTargets')}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-gray-500 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {t('dashboard_cancelTargets')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <TargetMeter label={t('dashboard_salesDailyTarget')} actual={daily.sales} target={targets.salesDaily} t={t} />
          <TargetMeter label={t('dashboard_salesMonthlyTarget')} actual={monthly.sales} target={targets.salesMonthly} t={t} />
          <TargetMeter label={t('dashboard_purchasesDailyTarget')} actual={daily.purchases} target={targets.purchasesDaily} t={t} />
          <TargetMeter label={t('dashboard_purchasesMonthlyTarget')} actual={monthly.purchases} target={targets.purchasesMonthly} t={t} />
        </div>
      )}
    </div>
  )
}

function TargetInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-sky-300">
        <span className="px-2.5 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 py-2">RM</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="flex-1 px-3 py-2 text-sm text-gray-900 outline-none"
        />
      </div>
    </div>
  )
}

function TargetMeter({ label, actual, target, t }: { label: string; actual: number; target: number | null; t: (key: TranslationKey) => string }) {
  if (target === null || target === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-base font-bold text-gray-900 mt-1">RM {actual.toFixed(2)}</p>
        <p className="text-xs text-gray-400 mt-1">{t('dashboard_noTargetSet')}</p>
      </div>
    )
  }
  const pct = Math.min((actual / target) * 100, 100)
  const isOver = actual >= target

  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-base font-bold mt-1 ${isOver ? 'text-emerald-600' : 'text-gray-900'}`}>
        RM {actual.toFixed(2)}
        <span className="text-xs font-normal text-gray-400 ml-1">/ RM {target.toFixed(2)}</span>
      </p>
      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isOver ? 'bg-emerald-500' : 'bg-sky-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{pct.toFixed(1)}%</p>
    </div>
  )
}

// ── Desktop components ───────────────────────────────────────────────────────

function MetricPair({
  label, dailyValue, monthlyLabel, monthlyValue, color, signed,
}: {
  label: string
  dailyValue: number
  monthlyLabel: string
  monthlyValue: number
  color: 'sky' | 'emerald' | 'violet'
  signed?: boolean
}) {
  const colorMap = { sky: 'text-sky-600', emerald: 'text-emerald-600', violet: 'text-violet-600' }
  const signedColor = signed
    ? monthlyValue >= 0 ? 'text-emerald-600' : 'text-red-600'
    : colorMap[color]
  const dailySignedColor = signed
    ? dailyValue >= 0 ? 'text-emerald-600' : 'text-red-600'
    : colorMap[color]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${dailySignedColor}`}>RM {dailyValue.toFixed(2)}</p>
      </div>
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-400 font-medium">{monthlyLabel}</p>
        <p className={`text-lg font-bold mt-0.5 ${signedColor}`}>RM {monthlyValue.toFixed(2)}</p>
      </div>
    </div>
  )
}

function ValueCard({ label, value, color }: { label: string; value: number; color: 'sky' | 'emerald' }) {
  const colorClass = color === 'emerald' ? 'text-emerald-600' : 'text-sky-600'
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1.5 ${colorClass}`}>RM {value.toFixed(2)}</p>
    </div>
  )
}

function DesktopStockTable({ items, t }: { items: StockItem[]; t: (key: TranslationKey) => string }) {
  const [page, setPage] = useState(1)
  const low = items.filter((i) => i.isLow)
  const ok = items.filter((i) => !i.isLow)
  const sorted = [...low, ...ok]
  if (sorted.length === 0) return <p className="text-sm text-gray-400 py-4">{t('dashboard_noStockRecords')}</p>
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{t('rawMaterials_name')}</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">{t('rawMaterials_quantityOnHand')}</th>
              <th className="px-4 py-2.5 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2.5 text-gray-900 font-medium">{item.name}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{formatQty(item.quantityOnHand, item.baseUnit)}</td>
                <td className="px-4 py-2.5 text-right">
                  {item.isLow && (
                    <span className="text-[10px] font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{t('rawMaterials_low')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={sorted.length} onPageChange={setPage} />
    </div>
  )
}

function DesktopFinishedGoodsTable({ items, t }: { items: FinishedGoodsItem[]; t: (key: TranslationKey) => string }) {
  const [page, setPage] = useState(1)
  if (items.length === 0) return <p className="text-sm text-gray-400 py-4">{t('dashboard_noFinishedGoods')}</p>
  const paged = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{t('products_name')}</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">{t('rawMaterials_quantityOnHand')}</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">{t('dashboard_value')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2.5 text-gray-900 font-medium">{item.name}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{item.finishedGoodsOnHand} {item.finishedGoodsUnit}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">
                  {item.salePrice !== null ? `RM ${(item.finishedGoodsOnHand * item.salePrice).toFixed(2)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={items.length} onPageChange={setPage} />
    </div>
  )
}

// ── Mobile components ────────────────────────────────────────────────────────

function MobileOverview({
  d, navigate, t,
}: {
  d: DashboardResponse
  navigate: (p: string) => void
  t: (key: TranslationKey) => string
}) {
  return (
    <>
      {d.monthly.pendingOrders > 0 && (
        <button
          onClick={() => navigate('/orders')}
          className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left"
        >
          <p className="text-sm font-medium text-amber-800">
            {t('dashboard_pendingAction').replace('{n}', String(d.monthly.pendingOrders))}
          </p>
          <p className="text-xs text-amber-600 mt-0.5">{t('dashboard_tapToView')}</p>
        </button>
      )}

      {/* Daily */}
      <div className="grid grid-cols-2 gap-3">
        <MobileMetricCard label={t('dashboard_dailySales')} value={`RM ${d.daily.sales.toFixed(2)}`} valueClass="text-sky-600" />
        <MobileMetricCard label={t('dashboard_dailyPurchases')} value={`RM ${d.daily.purchases.toFixed(2)}`} valueClass="text-violet-600" />
        <MobileMetricCard
          label={t('dashboard_dailyGrossProfit')}
          value={`RM ${d.daily.grossProfit.toFixed(2)}`}
          valueClass={d.daily.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
        <MobileMetricCard label={t('dashboard_orders')} value={String(d.monthly.totalOrders)}>
          {d.monthly.pendingOrders > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">{d.monthly.pendingOrders} {t('dashboard_pending')}</p>
          )}
        </MobileMetricCard>
      </div>

      {/* Monthly */}
      <div className="grid grid-cols-2 gap-3">
        <MobileMetricCard label={t('dashboard_monthlySales')} value={`RM ${d.monthly.sales.toFixed(2)}`} valueClass="text-sky-600" />
        <MobileMetricCard label={t('dashboard_monthlyPurchases')} value={`RM ${d.monthly.purchases.toFixed(2)}`} valueClass="text-violet-600" />
        <MobileMetricCard
          label={t('dashboard_monthlyGrossProfit')}
          value={`RM ${d.monthly.grossProfit.toFixed(2)}`}
          valueClass={d.monthly.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
        <MobileMetricCard label={t('dashboard_margin')} value={`${d.monthly.grossMargin.toFixed(1)}%`} />
      </div>

      {/* Value cards */}
      <div className="grid grid-cols-2 gap-3">
        <MobileMetricCard label={t('dashboard_readyStockValue')} value={`RM ${d.values.readyStockValue.toFixed(2)}`} valueClass="text-emerald-600" />
        <MobileMetricCard label={t('dashboard_rawMaterialValue')} value={`RM ${d.values.rawMaterialValue.toFixed(2)}`} valueClass="text-sky-600" />
      </div>
    </>
  )
}

function MobileMetricCard({
  label, value, valueClass, children,
}: {
  label: string
  value: string
  valueClass?: string
  children?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${valueClass ?? 'text-gray-900'}`}>{value}</p>
      {children}
    </div>
  )
}

function StockList({ items, onNavigate, t }: { items: StockItem[]; onNavigate: () => void; t: (key: TranslationKey) => string }) {
  const [page, setPage] = useState(1)
  const sorted = [...items.filter((s) => s.isLow), ...items.filter((s) => !s.isLow)]
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pagedLow = paged.filter((s) => s.isLow)
  const pagedOk = paged.filter((s) => !s.isLow)
  return (
    <div className="space-y-4">
      {pagedLow.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">{t('dashboard_lowStockHeader')}</p>
          <ul className="space-y-2">
            {pagedLow.map((item) => (
              <li key={item.id} className="bg-white rounded-2xl border border-red-200 p-4 flex justify-between">
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-sm font-medium text-red-600">{formatQty(item.quantityOnHand, item.baseUnit)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pagedOk.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('dashboard_adequateStock')}</p>
          <ul className="space-y-2">
            {pagedOk.map((item) => (
              <li key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 flex justify-between">
                <p className="text-sm text-gray-800">{item.name}</p>
                <p className="text-sm text-gray-600">{formatQty(item.quantityOnHand, item.baseUnit)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {items.length === 0 && <p className="text-sm text-gray-400 text-center py-8">{t('dashboard_noStockRecords')}</p>}
      <Pagination page={page} pageSize={PAGE_SIZE} total={sorted.length} onPageChange={setPage} />
      <button onClick={onNavigate} className="text-xs text-sky-600 font-medium">{t('dashboard_viewStockHistory')}</button>
    </div>
  )
}

function FinishedGoodsList({ items, onNavigate, t }: { items: FinishedGoodsItem[]; onNavigate: () => void; t: (key: TranslationKey) => string }) {
  const [page, setPage] = useState(1)
  const paged = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">{t('dashboard_noFinishedGoods')}</p>
      ) : (
        <ul className="space-y-2">
          {paged.map((item) => (
            <li key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  {item.salePrice !== null && (
                    <p className="text-xs text-gray-400 mt-0.5">RM {item.salePrice.toFixed(2)} {t('dashboard_perUnit')}</p>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900">{item.finishedGoodsOnHand} {item.finishedGoodsUnit}</p>
              </div>
              {item.salePrice !== null && (
                <p className="text-xs text-emerald-600 mt-1">{t('dashboard_value')} RM {(item.finishedGoodsOnHand * item.salePrice).toFixed(2)}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={items.length} onPageChange={setPage} />
      <button onClick={onNavigate} className="text-xs text-sky-600 font-medium">{t('dashboard_logNewProduction')}</button>
    </div>
  )
}
