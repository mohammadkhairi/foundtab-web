import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import { useT } from '../../../hooks/useT'

type RecipeOutput = { productId: string; quantityPerBatch: string; unit: string | null }
type Recipe = { id: string; name: string; outputs: RecipeOutput[] }

type LinkedOrderItem = {
  itemName: string
  quantity: string
  itemType: 'CATALOGUE' | 'PRODUCT'
  productId: string | null
}

type LinkedOrder = {
  id: string
  customerName: string | null
  fulfillmentDate: string | null
  items: LinkedOrderItem[]
}

type ProductionRow = {
  productId: string
  productName: string
  requiredQty: number
  recipeId: string
  batchCount: string
  enabled: boolean
}

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
  const [searchParams] = useSearchParams()
  const fromOrderId = searchParams.get('fromOrderId')
  const queryClient = useQueryClient()
  const { token, refreshToken } = useAuth()
  const t = useT()

  // Single-recipe mode state
  const [recipeId, setRecipeId] = useState('')
  const [batchCount, setBatchCount] = useState('1')
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState<ProductionPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Multi-recipe mode state
  const [rows, setRows] = useState<ProductionRow[]>([])
  const rowsInitialized = useRef(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: recipesData, isLoading: recipesLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<{ items: Recipe[] }>('/api/v1/recipes', { token }),
    enabled: !!token,
  })

  const { data: linkedOrder, isLoading: orderLoading } = useQuery({
    queryKey: ['order', fromOrderId],
    queryFn: () => apiFetch<LinkedOrder>(`/api/v1/orders/${fromOrderId}`, { token }),
    enabled: !!token && !!fromOrderId,
  })

  const recipes = recipesData?.items ?? []

  // Determine mode
  const productItems = linkedOrder?.items.filter((i) => i.itemType === 'PRODUCT' && i.productId) ?? []
  const isMultiMode = !!fromOrderId && productItems.length > 0

  // Initialize rows once order is loaded (recipes may be empty — shown as guidance)
  useEffect(() => {
    if (rowsInitialized.current || !fromOrderId || !linkedOrder) return
    const pItems = linkedOrder.items.filter((i) => i.itemType === 'PRODUCT' && i.productId)
    if (pItems.length === 0) return

    setRows(
      pItems.map((item) => {
        const matchingRecipes = recipes.filter((r) =>
          r.outputs.some((o) => o.productId === item.productId),
        )
        const autoRecipeId = matchingRecipes.length === 1 ? matchingRecipes[0].id : ''
        let suggestedBatch = '1'
        if (autoRecipeId) {
          const recipe = matchingRecipes[0]
          const output = recipe.outputs.find((o) => o.productId === item.productId)
          if (output) {
            const perBatch = parseFloat(output.quantityPerBatch)
            if (perBatch > 0)
              suggestedBatch = String(Math.ceil(parseFloat(item.quantity) / perBatch))
          }
        }
        return {
          productId: item.productId!,
          productName: item.itemName,
          requiredQty: parseFloat(item.quantity),
          recipeId: autoRecipeId,
          batchCount: suggestedBatch,
          enabled: true,
        }
      }),
    )
    rowsInitialized.current = true
  }, [fromOrderId, linkedOrder, recipes])

  // Re-run recipe auto-select once recipes load (rows may have been initialized before recipes arrived)
  useEffect(() => {
    if (!rowsInitialized.current || recipes.length === 0) return
    setRows((prev) =>
      prev.map((row) => {
        if (row.recipeId) return row // already has a selection
        const matchingRecipes = recipes.filter((r) =>
          r.outputs.some((o) => o.productId === row.productId),
        )
        if (matchingRecipes.length !== 1) return row
        const recipe = matchingRecipes[0]
        const output = recipe.outputs.find((o) => o.productId === row.productId)
        const perBatch = output ? parseFloat(output.quantityPerBatch) : 0
        const newBatch = perBatch > 0 ? String(Math.ceil(row.requiredQty / perBatch)) : row.batchCount
        return { ...row, recipeId: recipe.id, batchCount: newBatch }
      }),
    )
  }, [recipes])

  function updateRowRecipe(idx: number, newRecipeId: string) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row
        const recipe = recipes.find((r) => r.id === newRecipeId)
        let newBatchCount = row.batchCount
        if (recipe) {
          const output = recipe.outputs.find((o) => o.productId === row.productId)
          if (output) {
            const perBatch = parseFloat(output.quantityPerBatch)
            if (perBatch > 0)
              newBatchCount = String(Math.ceil(row.requiredQty / perBatch))
          }
        }
        return { ...row, recipeId: newRecipeId, batchCount: newBatchCount }
      }),
    )
  }

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

  async function handleSingleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!recipeId) { setError(t('productions_errorSelectRecipe')); return }
    if (!batchCount || parseFloat(batchCount) <= 0) { setError(t('productions_errorQuantity')); return }
    if (preview && !preview.sufficient) {
      setError(`Not enough ingredients. Max you can make: ${preview.maxBatchCount} batches.`)
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
          ...(fromOrderId ? { orderId: fromOrderId } : {}),
        }),
        token: freshToken,
      })
      void queryClient.invalidateQueries({ queryKey: ['productions'] })
      void queryClient.invalidateQueries({ queryKey: ['rawMaterials'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      if (fromOrderId) {
        void queryClient.invalidateQueries({ queryKey: ['order', fromOrderId] })
        navigate(`/orders/${fromOrderId}`)
      } else {
        navigate('/productions')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('productions_errorSave'))
    } finally {
      setSaving(false)
    }
  }

  async function handleMultiSubmit(e: React.FormEvent) {
    e.preventDefault()
    const enabled = rows.filter((r) => r.enabled)
    if (enabled.length === 0) { setError('Enable at least one item to create a production run.'); return }
    if (enabled.some((r) => !r.recipeId)) { setError('Please select a recipe for every enabled item.'); return }
    if (enabled.some((r) => !r.batchCount || parseFloat(r.batchCount) <= 0)) {
      setError('Enter a valid batch count for every enabled item.')
      return
    }
    const freshToken = await refreshToken()
    if (!freshToken) return
    setSaving(true)
    setError(null)
    try {
      for (const row of enabled) {
        await apiFetch('/api/v1/productions', {
          method: 'POST',
          body: JSON.stringify({ recipeId: row.recipeId, batchCount: parseFloat(row.batchCount), orderId: fromOrderId }),
          token: freshToken,
        })
      }
      void queryClient.invalidateQueries({ queryKey: ['productions'] })
      void queryClient.invalidateQueries({ queryKey: ['rawMaterials'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['order', fromOrderId] })
      navigate(`/orders/${fromOrderId}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('productions_errorSave'))
    } finally {
      setSaving(false)
    }
  }

  // ── Linked order banner ──
  const orderBanner = linkedOrder ? (
    <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 space-y-1">
      <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Linked order</p>
      <p className="text-sm font-semibold text-purple-800">
        {linkedOrder.customerName ?? 'Walk-in'}
        {linkedOrder.fulfillmentDate && (
          <span className="font-normal text-purple-600 ml-1">· due {linkedOrder.fulfillmentDate}</span>
        )}
      </p>
      {linkedOrder.items.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {linkedOrder.items.map((item, i) => (
            <li key={i} className="text-xs text-purple-600">
              {parseFloat(item.quantity)} × {item.itemName}
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : null

  // ── Multi-recipe fields ──
  const multiFields = (
    <>
      {orderBanner}

      {(orderLoading || recipesLoading) && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!orderLoading && !recipesLoading && rows.length > 0 && recipes.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">No recipes yet</p>
          <p className="text-xs text-amber-700">
            To log production for this order, you first need to create a recipe for each product.
            Recipes tell FoundTab which ingredients to use and how much each batch produces.
          </p>
          <a
            href="/recipes/new"
            className="inline-block text-xs font-medium text-amber-800 underline underline-offset-2"
          >
            Create a recipe →
          </a>
        </div>
      )}

      {!orderLoading && !recipesLoading && rows.length > 0 && recipes.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            What do you need to make?
          </p>
          <p className="text-xs text-gray-400 -mt-2">
            Each item from the order gets its own production run. Tick only what you're starting now.
          </p>

          {rows.map((row, idx) => {
            const availableRecipes = recipes.filter((r) =>
              r.outputs.some((o) => o.productId === row.productId),
            )
            const displayRecipes = availableRecipes.length > 0 ? availableRecipes : recipes
            const selectedRecipe = recipes.find((r) => r.id === row.recipeId)
            const output = selectedRecipe?.outputs.find((o) => o.productId === row.productId)
            const willProduce = output
              ? parseFloat(output.quantityPerBatch) * (parseFloat(row.batchCount) || 0)
              : 0
            const isSufficient = willProduce >= row.requiredQty

            return (
              <div
                key={idx}
                className={`rounded-xl border p-4 space-y-3 transition-opacity ${
                  row.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-50'
                }`}
              >
                {/* Row header */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, enabled: e.target.checked } : r)),
                      )
                    }
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{row.productName}</p>
                    <p className="text-xs text-gray-500">
                      You need: <span className="font-medium text-gray-700">{row.requiredQty}</span>
                    </p>
                  </div>
                  {row.enabled && row.recipeId && row.batchCount && parseFloat(row.batchCount) > 0 && (
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        isSufficient
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isSufficient
                        ? `✓ Will make ${willProduce % 1 === 0 ? willProduce : willProduce.toFixed(2)}`
                        : `⚠ Only ${willProduce % 1 === 0 ? willProduce : willProduce.toFixed(2)} of ${row.requiredQty}`}
                    </span>
                  )}
                </div>

                {/* Recipe + batch count — only when enabled */}
                {row.enabled && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Recipe to use
                      </label>
                      <select
                        value={row.recipeId}
                        onChange={(e) => updateRowRecipe(idx, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      >
                        <option value="">Choose a recipe…</option>
                        {displayRecipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                      {availableRecipes.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No recipes specifically for this item — showing all recipes
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        How many batches?
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          step="any"
                          value={row.batchCount}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, batchCount: e.target.value } : r,
                              ),
                            )
                          }
                          className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        {output && (
                          <span className="text-xs text-gray-500">
                            × {parseFloat(output.quantityPerBatch)} {output.unit ?? ''} per batch
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </>
      )}
    </>
  )

  // ── Single-recipe fields (original) ──
  const selected = recipes.find((r) => r.id === recipeId)
  const singleFields = (
    <>
      {orderBanner}

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
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
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
          {t('productions_notes')}{' '}
          <span className="text-gray-400 font-normal">({t('common_optional')})</span>
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

      {recipeId && batchCount && parseFloat(batchCount) > 0 && (
        <button
          type="button"
          onClick={() => void fetchPreview()}
          disabled={previewLoading}
          className="w-full border border-brand-300 text-brand-600 font-medium py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors disabled:opacity-60"
        >
          {previewLoading ? 'Checking ingredients...' : 'Check if I have enough ingredients →'}
        </button>
      )}

      {previewError && <p className="text-xs text-red-500">{previewError}</p>}

      {preview && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Ingredient check
          </p>
          {preview.ingredients.map((ing) => (
            <div
              key={ing.rawMaterialId}
              className={`rounded-xl border p-3 ${
                ing.shortfall > 0 ? 'border-red-200 bg-red-50' : 'border-green-100 bg-green-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-900">{ing.rawMaterialName}</span>
                <span
                  className={`text-xs font-medium ${
                    ing.shortfall > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {ing.shortfall > 0
                    ? `Need ${ing.neededBaseUnit.toFixed(2)} — only ${ing.totalAvailableBaseUnit.toFixed(2)} available`
                    : '✓ Enough'}
                </span>
              </div>
              {ing.variants.length > 1 && (
                <div className="space-y-1 mt-2">
                  {ing.variants.map((v) => (
                    <div
                      key={v.id}
                      className="flex justify-between items-center text-xs text-gray-600"
                    >
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
                You can make at most: {preview.maxBatchCount} batches
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

  const enabledCount = rows.filter((r) => r.enabled).length
  const noRecipesInMultiMode = isMultiMode && recipes.length === 0 && !recipesLoading
  const submitLabel = isMultiMode
    ? saving
      ? 'Creating runs...'
      : `Start ${enabledCount} production run${enabledCount !== 1 ? 's' : ''}`
    : saving
      ? t('common_saving')
      : t('productions_add')

  return (
    <div className="min-h-screen bg-brand-50 pb-20 md:pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500"
            aria-label={t('common_back')}
          >
            <BackArrow />
          </button>
          <h1 className="text-base font-semibold text-gray-900">{t('productions_formTitle')}</h1>
        </div>
      </header>

      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t('common_back')}
        >
          <BackArrow />
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">
          {t('productions_formTitle')}
        </h1>
      </header>

      <div className="md:max-w-4xl md:px-8 md:py-6">
        <form
          onSubmit={isMultiMode ? handleMultiSubmit : handleSingleSubmit}
          className="md:hidden p-4 space-y-4"
        >
          {isMultiMode ? multiFields : singleFields}
          {!noRecipesInMultiMode && (
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
            >
              {submitLabel}
            </button>
          )}
        </form>

        <form
          onSubmit={isMultiMode ? handleMultiSubmit : handleSingleSubmit}
          className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-card"
        >
          <div className="p-6 space-y-5">{isMultiMode ? multiFields : singleFields}</div>
          {!noRecipesInMultiMode && (
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-brand-600 transition-colors disabled:opacity-60"
              >
                {submitLabel}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
