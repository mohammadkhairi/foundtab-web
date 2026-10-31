import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import HelpDrawer from '../../../components/HelpDrawer'
import ArchiveDialog from '../../../components/ArchiveDialog'
import UnitSelect from '../../../components/UnitSelect'
import { useT } from '../../../hooks/useT'

type FormData = {
  name: string
  baseUnit: string
  quantityOnHand: string
  reorderLevel: string
  unitCost: string
}

type RawMaterial = {
  id: string
  name: string
  baseUnit: string
  currentStockBaseUnit: string
  lowThresholdBaseUnit: string | null
}

type MaterialVariant = {
  id: string
  name: string
  currentStockBaseUnit: string
  isActive: boolean
}

const EMPTY: FormData ={ name: '', baseUnit: 'kg', quantityOnHand: '0', reorderLevel: '', unitCost: '' }

const BackArrow = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const HelpIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

function VariantsSection({ materialId, orgToken }: { materialId: string; orgToken: string | undefined }) {
  const { refreshToken } = useAuth()
  const queryClient = useQueryClient()
  const [newVariantName, setNewVariantName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['raw-material-variants', materialId],
    queryFn: () => apiFetch<{ items: MaterialVariant[] }>(`/api/v1/raw-materials/${materialId}/variants`, { token: orgToken }),
    enabled: !!orgToken,
  })

  async function handleAdd() {
    if (!newVariantName.trim()) return
    const freshToken = await refreshToken()
    if (!freshToken) return
    setAdding(true)
    setAddError(null)
    try {
      await apiFetch(`/api/v1/raw-materials/${materialId}/variants`, {
        method: 'POST',
        body: JSON.stringify({ name: newVariantName.trim().toUpperCase() }),
        token: freshToken,
      })
      setNewVariantName('')
      void queryClient.invalidateQueries({ queryKey: ['raw-material-variants', materialId] })
    } catch {
      setAddError('Failed to add variant')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(variantId: string) {
    const freshToken = await refreshToken()
    if (!freshToken) return
    try {
      await apiFetch(`/api/v1/raw-materials/${materialId}/variants/${variantId}`, {
        method: 'DELETE',
        token: freshToken,
      })
      void queryClient.invalidateQueries({ queryKey: ['raw-material-variants', materialId] })
    } catch {}
  }

  const variants = data?.items ?? []

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Brands / Variants</p>
      <p className="text-xs text-gray-400">Different brands you purchase under this material (e.g. Cap Sawah, Cap Layar)</p>

      {isLoading && <div className="h-8 bg-gray-100 rounded animate-pulse" />}

      {!isLoading && variants.length > 0 && (
        <ul className="space-y-1">
          {variants.map((v) => (
            <li key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-900">{v.name}</span>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{parseFloat(v.currentStockBaseUnit)} in stock</span>
                <button
                  type="button"
                  onClick={() => void handleRemove(v.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && variants.length === 0 && (
        <p className="text-xs text-gray-400 italic">No variants yet. Add one below.</p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newVariantName}
          onChange={(e) => setNewVariantName(e.target.value.toUpperCase())}
          placeholder="e.g. CAP SAWAH"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAdd() } }}
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={adding || !newVariantName.trim()}
          className="bg-sky-500 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-sky-600 transition-colors"
        >
          Add
        </button>
      </div>
      {addError && <p className="text-xs text-red-500">{addError}</p>}
    </div>
  )
}

export default function RawMaterialFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [archiveDialog, setArchiveDialog] = useState<{ usageLines: string[] } | null>(null)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    if (!isEdit || !token) return
    void apiFetch<RawMaterial>(`/api/v1/raw-materials/${id}`, { token }).then((rm) => {
      setForm({
        name: rm.name,
        baseUnit: rm.baseUnit,
        quantityOnHand: rm.currentStockBaseUnit ?? '0',
        reorderLevel: rm.lowThresholdBaseUnit ?? '',
        unitCost: '',
      })
      setLoading(false)
    }).catch(() => {
      setError(t('rawMaterials_loadError'))
      setLoading(false)
    })
  }, [id, isEdit, token])

  function updateField(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError(t('rawMaterials_nameRequired')); return }
    const freshToken = await refreshToken()
    if (!freshToken) { setError(t('error_generic')); return }
    setSaving(true)
    setError(null)

    const unit = form.baseUnit.trim() || 'kg'
    const initialQty = parseFloat(form.quantityOnHand) || 0
    const reorderLevel = form.reorderLevel !== '' ? parseFloat(form.reorderLevel) : undefined

    const createPayload = {
      name: form.name.trim(),
      purchaseUnit: unit,
      baseUnit: unit,
      conversionFactor: 1,
      ...(reorderLevel !== undefined ? { lowThresholdBaseUnit: reorderLevel } : {}),
    }

    const updatePayload = {
      name: form.name.trim(),
      ...(reorderLevel !== undefined ? { lowThresholdBaseUnit: reorderLevel } : {}),
    }

    try {
      if (isEdit) {
        await apiFetch(`/api/v1/raw-materials/${id}`, { method: 'PATCH', body: JSON.stringify(updatePayload), token: freshToken })
      } else {
        const created = await apiFetch<{ id: string }>('/api/v1/raw-materials', { method: 'POST', body: JSON.stringify(createPayload), token: freshToken })
        if (initialQty > 0) {
          await apiFetch(`/api/v1/raw-materials/${created.id}/adjust-stock`, {
            method: 'POST',
            body: JSON.stringify({ quantityDelta: initialQty, unit, notes: 'Initial stock' }),
            token: freshToken,
          })
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['rawMaterials'] })
      navigate('/raw-materials')
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(t('rawMaterials_saveError'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function openArchiveDialog() {
    const freshToken = await refreshToken()
    if (!freshToken) return
    try {
      const usage = await apiFetch<{ activeRecipes: number; plannedProductions: number }>(
        `/api/v1/raw-materials/${id}/usage`,
        { token: freshToken },
      )
      const lines: string[] = []
      if (usage.activeRecipes > 0) lines.push(`${usage.activeRecipes} product recipe${usage.activeRecipes !== 1 ? 's' : ''}`)
      if (usage.plannedProductions > 0) lines.push(`${usage.plannedProductions} planned production${usage.plannedProductions !== 1 ? 's' : ''}`)
      setArchiveDialog({ usageLines: lines })
    } catch {
      setError(t('rawMaterials_deleteError'))
    }
  }

  async function handleArchiveConfirm() {
    const freshToken = await refreshToken()
    if (!freshToken) return
    setArchiving(true)
    try {
      await apiFetch(`/api/v1/raw-materials/${id}`, { method: 'DELETE', token: freshToken })
      void queryClient.invalidateQueries({ queryKey: ['rawMaterials'] })
      navigate('/raw-materials')
    } catch {
      setError(t('rawMaterials_deleteError'))
      setArchiving(false)
      setArchiveDialog(null)
    }
  }

  if (loading) return <LoadingSpinner />

  const title = isEdit ? t('rawMaterials_formEditTitle') : t('rawMaterials_formAddTitle')

  function goToHistory() {
    navigate(`/stock-movements?materialId=${id}`)
  }

  const fields = (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="rm-name">
          {t('rawMaterials_name')} <span className="text-red-500">*</span>
        </label>
        <input
          id="rm-name"
          type="text"
          value={form.name}
          onChange={updateField('name')}
          placeholder={t('rawMaterials_namePlaceholder')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <p className="text-xs text-gray-400 mt-1">{t('rawMaterials_nameHint')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="base-unit">
          {t('rawMaterials_unit')} <span className="text-red-500">*</span>
        </label>
        <UnitSelect
          id="base-unit"
          value={form.baseUnit}
          onChange={(val) => setForm((prev) => ({ ...prev, baseUnit: val }))}
        />
        <p className="text-xs text-gray-400 mt-1">{t('rawMaterials_unitHint')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="qty">
          {t('rawMaterials_quantityOnHand')} ({form.baseUnit || 'unit'})
        </label>
        <input
          id="qty"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={form.quantityOnHand}
          onChange={updateField('quantityOnHand')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <p className="text-xs text-gray-400 mt-1">{t('rawMaterials_quantityHint')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reorder">
          {t('rawMaterials_reorderLevel')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
        </label>
        <input
          id="reorder"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={form.reorderLevel}
          onChange={updateField('reorderLevel')}
          placeholder={`e.g. 5 ${form.baseUnit}`}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <p className="text-xs text-gray-400 mt-1">{t('rawMaterials_reorderLevelHint')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="cost">
          {t('rawMaterials_unitCost')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
        </label>
        <input
          id="cost"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={form.unitCost}
          onChange={updateField('unitCost')}
          placeholder="e.g. 2.50"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <p className="text-xs text-gray-400 mt-1">{t('rawMaterials_unitCostHint')}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      {/* Mobile sticky header */}
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
            <BackArrow />
          </button>
          <h1 className="text-base font-semibold text-gray-900 flex-1">{title}</h1>
          <button onClick={() => setHelpOpen(true)} className="text-gray-400" aria-label="Help">
            <HelpIcon />
          </button>
        </div>
      </header>

      {/* Desktop content */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label={t('common_back')}>
          <BackArrow />
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">{title}</h1>
        <button onClick={() => setHelpOpen(true)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Help">
          <HelpIcon />
        </button>
      </header>

      <div className="md:max-w-4xl md:px-8 md:py-6">

        {/* Mobile: plain form */}
        <form onSubmit={handleSubmit} className="md:hidden p-4 space-y-4">
          {fields}
          {isEdit && id && (
            <VariantsSection materialId={id} orgToken={token} />
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
          >
            {saving ? t('common_saving') : t('common_save')}
          </button>
          {isEdit && (
            <>
              <button
                type="button"
                onClick={goToHistory}
                className="w-full text-sky-600 font-medium py-2 text-sm flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {t('rawMaterials_viewHistory')}
              </button>
              <button
                type="button"
                onClick={() => void openArchiveDialog()}
                disabled={saving}
                className="w-full text-red-500 font-medium py-2 text-sm disabled:opacity-60"
              >
                Archive
              </button>
            </>
          )}
        </form>

        {/* Desktop: card form */}
        <form onSubmit={handleSubmit} className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-card">
          <div className="p-6 space-y-5">
            {fields}
            {isEdit && id && (
              <VariantsSection materialId={id} orgToken={token} />
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            {isEdit ? (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={goToHistory}
                  className="text-sky-600 text-sm font-medium hover:text-sky-700 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {t('rawMaterials_viewHistory')}
                </button>
                <button
                  type="button"
                  onClick={() => void openArchiveDialog()}
                  disabled={saving}
                  className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors disabled:opacity-60"
                >
                  Archive
                </button>
              </div>
            ) : <div />}
            <button
              type="submit"
              disabled={saving}
              className="bg-sky-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-sky-600 transition-colors disabled:opacity-60"
            >
              {saving ? t('common_saving') : t('common_save')}
            </button>
          </div>
        </form>
      </div>

      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)} title={t('rawMaterials_helpTitle')}>
        <p>{t('rawMaterials_helpDesc')}</p>
        <p>{t('rawMaterials_helpBaseUnit')}</p>
        <p>{t('rawMaterials_helpThreshold')}</p>
        <p>{t('rawMaterials_helpUnitCost')}</p>
      </HelpDrawer>

      {archiveDialog && (
        <ArchiveDialog
          title="Archive this material?"
          description="The material will be hidden from active lists and cannot be used in new recipes."
          usageLines={archiveDialog.usageLines}
          onConfirm={() => void handleArchiveConfirm()}
          onCancel={() => setArchiveDialog(null)}
          confirming={archiving}
        />
      )}
    </div>
  )
}
