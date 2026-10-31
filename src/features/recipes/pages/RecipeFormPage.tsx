import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import UnitSelect from '../../../components/UnitSelect'
import { useT } from '../../../hooks/useT'

type RawMaterial = { id: string; name: string; baseUnit: string }
type Product = { id: string; name: string; unit: string }
type IngredientLine = { rawMaterialId: string; name: string; quantity: string; unit: string; description: string }
type OutputLine = { productId: string; name: string; quantityPerBatch: string; unit: string }
type RawMaterialOutputLine = { rawMaterialId: string; name: string; quantityPerBatch: string; unit: string }

type RecipeType = 'PRODUCTION' | 'YIELD_BREAKDOWN'

const BackArrow = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

export default function RecipeFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [recipeType, setRecipeType] = useState<RecipeType>('PRODUCTION')
  const [notes, setNotes] = useState('')
  const [ingredients, setIngredients] = useState<IngredientLine[]>([])
  const [outputs, setOutputs] = useState<OutputLine[]>([])
  const [rawMaterialOutputs, setRawMaterialOutputs] = useState<RawMaterialOutputLine[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)

  const [showIngredientPicker, setShowIngredientPicker] = useState(false)
  const [showOutputPicker, setShowOutputPicker] = useState(false)
  const [showRmOutputPicker, setShowRmOutputPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [outputSearch, setOutputSearch] = useState('')
  const [rmOutputSearch, setRmOutputSearch] = useState('')
  const ingredientPickerRef = useRef<HTMLDivElement>(null)
  const outputPickerRef = useRef<HTMLDivElement>(null)
  const rmOutputPickerRef = useRef<HTMLDivElement>(null)

  const { data: materialsData } = useQuery({
    queryKey: ['rawMaterials', 'all'],
    queryFn: () => apiFetch<{ items: RawMaterial[] }>('/api/v1/raw-materials?pageSize=500', { token }),
    enabled: !!token,
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => apiFetch<{ items: Product[] }>('/api/v1/products?pageSize=500', { token }),
    enabled: !!token,
  })

  useEffect(() => {
    if (!isEdit || !token) return
    const materialMap = new Map((materialsData?.items ?? []).map((m) => [m.id, m]))
    const productMap = new Map((productsData?.items ?? []).map((p) => [p.id, p]))
    void apiFetch<{
      id: string; name: string; type: string; notes?: string
      ingredients: any[]; outputs: any[]; rawMaterialOutputs: any[]
    }>(`/api/v1/recipes/${id}`, { token }).then((recipe) => {
      setName(recipe.name)
      setRecipeType((recipe.type as RecipeType) ?? 'PRODUCTION')
      setNotes(recipe.notes ?? '')
      setIngredients(recipe.ingredients.map((i: any) => ({
        rawMaterialId: i.rawMaterialId,
        name: materialMap.get(i.rawMaterialId)?.name ?? i.rawMaterialId,
        quantity: String(parseFloat(i.quantityBaseUnit) || 0),
        unit: i.unit ?? materialMap.get(i.rawMaterialId)?.baseUnit ?? '',
        description: i.description ?? '',
      })))
      setOutputs(recipe.outputs.map((o: any) => ({
        productId: o.productId,
        name: productMap.get(o.productId)?.name ?? o.productId,
        quantityPerBatch: String(parseFloat(o.quantityPerBatch) || 1),
        unit: o.unit ?? productMap.get(o.productId)?.unit ?? '',
      })))
      setRawMaterialOutputs((recipe.rawMaterialOutputs ?? []).map((o: any) => ({
        rawMaterialId: o.rawMaterialId,
        name: materialMap.get(o.rawMaterialId)?.name ?? o.rawMaterialId,
        quantityPerBatch: String(parseFloat(o.quantityPerBatch) || 1),
        unit: o.unit ?? materialMap.get(o.rawMaterialId)?.baseUnit ?? '',
      })))
      setLoading(false)
    }).catch(() => {
      setError(t('recipe_errorLoad'))
      setLoading(false)
    })
  }, [id, isEdit, token, materialsData, productsData])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ingredientPickerRef.current && !ingredientPickerRef.current.contains(e.target as Node)) setShowIngredientPicker(false)
      if (outputPickerRef.current && !outputPickerRef.current.contains(e.target as Node)) setShowOutputPicker(false)
      if (rmOutputPickerRef.current && !rmOutputPickerRef.current.contains(e.target as Node)) setShowRmOutputPicker(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const materials = materialsData?.items ?? []
  const products = productsData?.items ?? []
  const filteredMaterials = search ? materials.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())) : materials
  const filteredProducts = outputSearch ? products.filter((p) => p.name.toLowerCase().includes(outputSearch.toLowerCase())) : products
  const filteredRmOutputMaterials = rmOutputSearch
    ? materials.filter((m) => m.name.toLowerCase().includes(rmOutputSearch.toLowerCase()))
    : materials

  function addIngredient(mat: RawMaterial) {
    setIngredients((prev) => [...prev, { rawMaterialId: mat.id, name: mat.name, quantity: '1', unit: mat.baseUnit, description: '' }])
    setShowIngredientPicker(false); setSearch('')
  }

  function addOutput(prod: Product) {
    if (outputs.some((o) => o.productId === prod.id)) return
    setOutputs((prev) => [...prev, { productId: prod.id, name: prod.name, quantityPerBatch: '1', unit: prod.unit }])
    setShowOutputPicker(false); setOutputSearch('')
  }

  function addRmOutput(mat: RawMaterial) {
    if (rawMaterialOutputs.some((o) => o.rawMaterialId === mat.id)) return
    setRawMaterialOutputs((prev) => [...prev, { rawMaterialId: mat.id, name: mat.name, quantityPerBatch: '1', unit: mat.baseUnit }])
    setShowRmOutputPicker(false); setRmOutputSearch('')
  }

  async function handleSave() {
    if (!name.trim()) { setError('Recipe name is required'); return }
    if (recipeType === 'PRODUCTION' && outputs.length === 0) { setError('Add at least one product output'); return }
    if (recipeType === 'YIELD_BREAKDOWN' && rawMaterialOutputs.length === 0) { setError('Add at least one sub-component output'); return }
    const freshToken = await refreshToken()
    if (!freshToken) return
    setSaving(true); setError(null)
    try {
      const payload = {
        name: name.trim(),
        type: recipeType,
        notes: notes.trim() || undefined,
        ingredients: ingredients.map((i) => ({
          rawMaterialId: i.rawMaterialId,
          quantityBaseUnit: parseFloat(i.quantity) || 0,
          ...(i.unit ? { unit: i.unit } : {}),
          ...(i.description.trim() ? { description: i.description.trim() } : {}),
        })),
        outputs: recipeType === 'PRODUCTION'
          ? outputs.map((o) => ({
              productId: o.productId,
              quantityPerBatch: parseFloat(o.quantityPerBatch) || 1,
              unit: o.unit || undefined,
            }))
          : [],
        rawMaterialOutputs: recipeType === 'YIELD_BREAKDOWN'
          ? rawMaterialOutputs.map((o) => ({
              rawMaterialId: o.rawMaterialId,
              quantityPerBatch: parseFloat(o.quantityPerBatch) || 1,
              unit: o.unit || undefined,
            }))
          : undefined,
      }
      if (isEdit) {
        await apiFetch(`/api/v1/recipes/${id}`, { method: 'PUT', body: JSON.stringify(payload), token: freshToken })
      } else {
        await apiFetch('/api/v1/recipes', { method: 'POST', body: JSON.stringify(payload), token: freshToken })
      }
      void queryClient.invalidateQueries({ queryKey: ['recipes'] })
      navigate('/recipes')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('recipe_errorSave'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const materialPickerContent = (items: typeof filteredMaterials, onSelect: (m: RawMaterial) => void, searchVal: string, onSearch: (v: string) => void) => (
    <>
      <div className="p-3 border-b border-gray-100">
        <input type="text" value={searchVal} onChange={(e) => onSearch(e.target.value)}
          placeholder={t('recipe_searchMaterial')}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" autoFocus />
      </div>
      <ul className="overflow-y-auto max-h-52">
        {items.map((m) => (
          <li key={m.id}>
            <button onClick={() => onSelect(m)} className="w-full px-4 py-2.5 text-left text-sm text-gray-800 border-b border-gray-50 hover:bg-sky-50 hover:text-sky-700 transition-colors">
              {m.name}<span className="text-xs text-gray-400 ml-2">({m.baseUnit})</span>
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="p-4 text-center text-sm text-gray-400">{t('recipe_noMatch')}</li>}
      </ul>
    </>
  )

  const outputPickerContent = (
    <>
      <div className="p-3 border-b border-gray-100">
        <input type="text" value={outputSearch} onChange={(e) => setOutputSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" autoFocus />
      </div>
      <ul className="overflow-y-auto max-h-52">
        {filteredProducts.map((p) => (
          <li key={p.id}>
            <button onClick={() => addOutput(p)} className="w-full px-4 py-2.5 text-left text-sm text-gray-800 border-b border-gray-50 hover:bg-sky-50 hover:text-sky-700 transition-colors">
              {p.name}<span className="text-xs text-gray-400 ml-2">({p.unit})</span>
            </button>
          </li>
        ))}
        {filteredProducts.length === 0 && <li className="p-4 text-center text-sm text-gray-400">{t('recipe_noMatch')}</li>}
      </ul>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}><BackArrow /></button>
          <h1 className="text-base font-semibold text-gray-900 flex-1">{isEdit ? 'Edit Recipe' : 'New Recipe'}</h1>
        </div>
      </header>

      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors"><BackArrow /></button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">{isEdit ? 'Edit Recipe' : 'New Recipe'}</h1>
      </header>

      <div className="md:max-w-4xl md:px-8 md:py-6">

        <div className="p-4 md:p-0 space-y-5">
          {/* Recipe name + type */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('recipe_nameLabel')} <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={t('recipe_namePlaceholder')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Recipe Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRecipeType('PRODUCTION')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    recipeType === 'PRODUCTION'
                      ? 'bg-sky-500 text-white border-sky-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-sky-300'
                  }`}>
                  Production
                </button>
                <button
                  type="button"
                  onClick={() => setRecipeType('YIELD_BREAKDOWN')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    recipeType === 'YIELD_BREAKDOWN'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-amber-300'
                  }`}>
                  Yield Breakdown
                </button>
              </div>
              {recipeType === 'YIELD_BREAKDOWN' && (
                <p className="text-xs text-amber-600 mt-1.5">Splits a raw material into sub-components (e.g. whole chicken → breast, thigh, wing).</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes (optional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Loyang 8 inci, makes 24 pieces"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>

          {/* Ingredients section */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
              {recipeType === 'YIELD_BREAKDOWN' ? 'Input Material' : t('recipe_ingredientsTitle')}
            </p>
            {ingredients.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden divide-y divide-gray-100 mb-3">
                {ingredients.map((line, idx) => (
                  <div key={idx} className="p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">{line.name}</p>
                      <input type="number" inputMode="decimal" min="0" step="any" value={line.quantity}
                        onChange={(e) => setIngredients((prev) => prev.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
                        aria-label="Qty" />
                      <UnitSelect
                        value={line.unit}
                        onChange={(val) => setIngredients((prev) => prev.map((l, i) => i === idx ? { ...l, unit: val } : l))}
                        className="w-28"
                      />
                      <button onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <input type="text" value={line.description}
                      onChange={(e) => setIngredients((prev) => prev.map((l, i) => i === idx ? { ...l, description: e.target.value } : l))}
                      placeholder={t('recipe_descriptionPlaceholder')}
                      className="w-full border border-gray-100 bg-gray-50 rounded-lg px-2 py-1.5 text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-sky-400 focus:bg-white focus:border-gray-300 placeholder-gray-300" />
                  </div>
                ))}
              </div>
            )}
            <div className="relative" ref={ingredientPickerRef}>
              <button onClick={() => { setShowIngredientPicker((v) => !v); setSearch('') }}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-2.5 text-gray-500 text-sm font-medium hover:border-sky-300 hover:text-sky-600 transition-colors">
                + {recipeType === 'YIELD_BREAKDOWN' ? 'Add Input Material' : t('recipe_addIngredient')}
              </button>
              {showIngredientPicker && (
                <div className="hidden md:block absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-card shadow-lg z-30 overflow-hidden">
                  {materialPickerContent(filteredMaterials, addIngredient, search, setSearch)}
                </div>
              )}
            </div>
          </div>

          {/* Outputs section — product outputs for PRODUCTION */}
          {recipeType === 'PRODUCTION' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">{t('recipe_outputsTitle')}</p>
              {outputs.length === 0 && (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-4 text-center mb-3">
                  <p className="text-sm text-gray-400">{t('recipe_noOutputs')}</p>
                </div>
              )}
              {outputs.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden divide-y divide-gray-100 mb-3">
                  {outputs.map((out, idx) => (
                    <div key={idx} className="p-3 flex items-center gap-3">
                      <p className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">{out.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">×</span>
                        <input type="number" inputMode="decimal" min="0.001" step="any" value={out.quantityPerBatch}
                          onChange={(e) => setOutputs((prev) => prev.map((o, i) => i === idx ? { ...o, quantityPerBatch: e.target.value } : o))}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
                          aria-label={t('recipe_outputQty')} />
                        <UnitSelect
                          value={out.unit}
                          onChange={(val) => setOutputs((prev) => prev.map((o, i) => i === idx ? { ...o, unit: val } : o))}
                          className="w-28"
                        />
                      </div>
                      <button onClick={() => setOutputs((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative" ref={outputPickerRef}>
                <button onClick={() => { setShowOutputPicker((v) => !v); setOutputSearch('') }}
                  className="w-full border-2 border-dashed border-sky-300 rounded-xl py-2.5 text-sky-600 text-sm font-medium hover:bg-sky-50 transition-colors">
                  + {t('recipe_addOutput')}
                </button>
                {showOutputPicker && (
                  <div className="hidden md:block absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-card shadow-lg z-30 overflow-hidden">
                    {outputPickerContent}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Outputs section — raw material outputs for YIELD_BREAKDOWN */}
          {recipeType === 'YIELD_BREAKDOWN' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Sub-component Outputs</p>
              {rawMaterialOutputs.length === 0 && (
                <div className="bg-white rounded-xl border-2 border-dashed border-amber-200 p-4 text-center mb-3">
                  <p className="text-sm text-gray-400">Add the materials you get out of the breakdown</p>
                </div>
              )}
              {rawMaterialOutputs.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden divide-y divide-gray-100 mb-3">
                  {rawMaterialOutputs.map((out, idx) => (
                    <div key={idx} className="p-3 flex items-center gap-3">
                      <p className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">{out.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">×</span>
                        <input type="number" inputMode="decimal" min="0.001" step="any" value={out.quantityPerBatch}
                          onChange={(e) => setRawMaterialOutputs((prev) => prev.map((o, i) => i === idx ? { ...o, quantityPerBatch: e.target.value } : o))}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                          aria-label="Qty per batch" />
                        <UnitSelect
                          value={out.unit}
                          onChange={(val) => setRawMaterialOutputs((prev) => prev.map((o, i) => i === idx ? { ...o, unit: val } : o))}
                          className="w-28"
                        />
                      </div>
                      <button onClick={() => setRawMaterialOutputs((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative" ref={rmOutputPickerRef}>
                <button onClick={() => { setShowRmOutputPicker((v) => !v); setRmOutputSearch('') }}
                  className="w-full border-2 border-dashed border-amber-300 rounded-xl py-2.5 text-amber-600 text-sm font-medium hover:bg-amber-50 transition-colors">
                  + Add Sub-component
                </button>
                {showRmOutputPicker && (
                  <div className="hidden md:block absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-card shadow-lg z-30 overflow-hidden">
                    {materialPickerContent(filteredRmOutputMaterials, addRmOutput, rmOutputSearch, setRmOutputSearch)}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button onClick={() => void handleSave()} disabled={saving}
            className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 hover:bg-sky-600 transition-colors">
            {saving ? t('common_saving') : t('recipe_save')}
          </button>
        </div>
      </div>

      {/* Mobile pickers */}
      {showIngredientPicker && (
        <div className="md:hidden">
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowIngredientPicker(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {recipeType === 'YIELD_BREAKDOWN' ? 'Pick Input Material' : t('recipe_pickMaterial')}
              </h3>
              <button onClick={() => setShowIngredientPicker(false)} className="text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {materialPickerContent(filteredMaterials, addIngredient, search, setSearch)}
          </div>
        </div>
      )}
      {showOutputPicker && recipeType === 'PRODUCTION' && (
        <div className="md:hidden">
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowOutputPicker(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Pick product</h3>
              <button onClick={() => setShowOutputPicker(false)} className="text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {outputPickerContent}
          </div>
        </div>
      )}
      {showRmOutputPicker && recipeType === 'YIELD_BREAKDOWN' && (
        <div className="md:hidden">
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowRmOutputPicker(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Pick Sub-component</h3>
              <button onClick={() => setShowRmOutputPicker(false)} className="text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {materialPickerContent(filteredRmOutputMaterials, addRmOutput, rmOutputSearch, setRmOutputSearch)}
          </div>
        </div>
      )}
    </div>
  )
}
