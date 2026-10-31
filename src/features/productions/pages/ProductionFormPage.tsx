import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import { useT } from '../../../hooks/useT'

type RecipeOutput = { productId: string; quantityPerBatch: string; unit: string | null }
type Recipe = { id: string; name: string; outputs: RecipeOutput[] }

type PreviewVariant = {
  id: string
  name: string
  currentStockBaseUnit: number
  isAvailable: boolean
}

type PreviewIngredient = {
  rawMaterialId: string
  rawMaterialName: string
  neededBaseUnit: number
  variants: PreviewVariant[]
  totalAvailableBaseUnit: number
  shortfall: number
}

type ProductionPreview = {
  sufficient: boolean
  maxBatchCount: number
  ingredients: PreviewIngredient[]
}

const BackArrow = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

export default function ProductionFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { token, refreshToken } = useAuth()
  const t = useT()

  const [recipeId, setRecipeId] = useState('')
  const [batchCount, setBatchCount] = useState('1')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ProductionPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<{ items: Recipe[] }>('/api/v1/recipes', { token }),
    enabled: !!token,
  })

  const recipes = recipesData?.items ?? []
  const selected = recipes.find((r) => r.id === recipeId)

  async function fetchPreview() {
    if (!recipeId || !batchCount || parseFloat(batchCount) <= 0) return
    const freshToken = await refreshToken()
    if (!freshToken) return
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const result = await apiFetch<ProductionPreview>(
        `/api/v1/productions/preview?recipeId=${encodeURIComponent(recipeId)}&batchCount=${encodeURIComponent(batchCount)}`,
        { token: freshToken },
      )
      setPreview(result)
    } catch (err) {
      setPreviewError(err instanceof ApiError ? err.message : 'Failed to check stock')
      setPreview(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!recipeId) { setError(t('productions_errorSelectRecipe')); return }
    if (!batchCount || parseFloat(batchCount) <= 0) { setError(t('productions_errorQuantity')); return }
    // Block submit if preview shows a shortfall
    if (preview && !preview.sufficient) {
      setError(`Insufficient stock. Max you can make: ${preview.maxBatchCount} batches.`)
      return
    }
    const freshToken = await refreshToken()
    if (!freshToken) return
    setSaving(true)
    setError(null)

    try {
      await apiFetch('/api/v1/productions', {
        method: 'POST',
        body: JSON.stringify({
          recipeId,
          batchCount: parseFloat(batchCount),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
        token: freshToken,
      })
      void queryClient.invalidateQueries({ queryKey: ['productions'] })
      void queryClient.invalidateQueries({ queryKey: ['rawMaterials'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      navigate('/productions')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('productions_errorSave'))
    } finally {
      setSaving(false)
    }
  }

  const fields = (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="recipe-select">
          {t('productions_recipeLabel')} <span className="text-red-500">*</span>
        </label>
        {recipesLoading ? (
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <select
            id="recipe-select"
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">{t('productions_selectRecipePlaceholder')}</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
      </div>

      {selected && selected.outputs.length > 0 && (
        <div className="bg-brand-50 border border-brand-100 rounded-lg px-3 py-2.5">
          <p className="text-xs font-medium text-brand-700 mb-1">{t('productions_outputs')}</p>
          <ul className="space-y-0.5">
            {selected.outputs.map((o, i) => (
              <li key={i} className="text-xs text-brand-600">
                {parseFloat(o.quantityPerBatch)} {o.unit ?? ''} per batch
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="batch-count">
          {t('productions_batchCount')} <span className="text-red-500">*</span>
        </label>
        <input
          id="batch-count"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="any"
          value={batchCount}
          onChange={(e) => setBatchCount(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          data-tour="production-log"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="prod-notes">
          {t('productions_notes')} <span className="text-gray-400 font-normal">({t('common_optional')})</span>
        </label>
        <textarea
          id="prod-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t('productions_notesPlaceholder')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      {/* Stock check button */}
      {recipeId && batchCount && parseFloat(batchCount) > 0 && (
        <button
          type="button"
          onClick={() => void fetchPreview()}
          disabled={previewLoading}
          className="w-full border border-brand-300 text-brand-600 font-medium py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors disabled:opacity-60"
        >
          {previewLoading ? 'Checking stock...' : 'Check stock →'}
        </button>
      )}

      {previewError && <p className="text-xs text-red-500">{previewError}</p>}

      {/* Stock breakdown */}
      {preview && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock check</p>
          {preview.ingredients.map((ing) => (
            <div
              key={ing.rawMaterialId}
              className={`rounded-xl border p-3 ${ing.shortfall > 0 ? 'border-red-200 bg-red-50' : 'border-green-100 bg-green-50'}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-900">{ing.rawMaterialName}</span>
                <span className={`text-xs font-medium ${ing.shortfall > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {ing.shortfall > 0
                    ? `Need ${ing.neededBaseUnit.toFixed(2)} — only ${ing.totalAvailableBaseUnit.toFixed(2)} available`
                    : '✓ enough'}
                </span>
              </div>
              {ing.variants.length > 1 && (
                <div className="space-y-1 mt-2">
                  {ing.variants.map((v) => (
                    <div key={v.id} className="flex justify-between items-center text-xs text-gray-600">
                      <span>{v.name}</span>
                      <span>{v.currentStockBaseUnit.toFixed(2)} in stock</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!preview.sufficient && (
            <div className="space-y-2">
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Max you can make: {preview.maxBatchCount} batches
              </p>
              {preview.maxBatchCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBatchCount(String(preview.maxBatchCount))
                    setPreview(null)
                  }}
                  className="w-full border border-amber-300 text-amber-700 font-medium py-2 rounded-lg text-sm hover:bg-amber-50 transition-colors"
                >
                  Make {preview.maxBatchCount} instead
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
            <BackArrow />
          </button>
          <h1 className="text-base font-semibold text-gray-900">{t('productions_formTitle')}</h1>
        </div>
      </header>

      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label={t('common_back')}>
          <BackArrow />
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('productions_formTitle')}</h1>
      </header>

      <div className="md:max-w-4xl md:px-8 md:py-6">

        <form onSubmit={handleSubmit} className="md:hidden p-4 space-y-4">
          {fields}
          <button type="submit" disabled={saving} className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
            {saving ? t('common_saving') : t('productions_add')}
          </button>
        </form>

        <form onSubmit={handleSubmit} className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-card">
          <div className="p-6 space-y-5">
            {fields}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button type="submit" disabled={saving} className="bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-brand-600 transition-colors disabled:opacity-60">
              {saving ? t('common_saving') : t('productions_add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
