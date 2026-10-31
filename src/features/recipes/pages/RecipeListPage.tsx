import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import EmptyState from '../../../components/EmptyState'
import ErrorState from '../../../components/ErrorState'
import Pagination from '../../../components/Pagination'
import { useT } from '../../../hooks/useT'

type RecipeOutput = { productId: string; quantityPerBatch: string; unit?: string }
type RecipeIngredient = { rawMaterialId: string; quantityBaseUnit: string }
type Recipe = { id: string; name: string; ingredients: RecipeIngredient[]; outputs: RecipeOutput[] }

type ListResponse = {
  items: Recipe[]
  total: number
  page: number
  pageSize: number
}

type CsvRow = { type: 'ingredient' | 'output'; recipe_name: string; name: string; qty: number; unit: string }

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const typeIdx = header.indexOf('type')
  const recipeIdx = header.indexOf('recipe_name')
  const nameIdx = header.indexOf('name')
  const qtyIdx = header.indexOf('qty')
  const unitIdx = header.indexOf('unit')
  if ([typeIdx, recipeIdx, nameIdx, qtyIdx, unitIdx].some((i) => i === -1)) return []

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim())
    const type = cols[typeIdx]?.toLowerCase()
    if (type !== 'ingredient' && type !== 'output') continue
    const qty = parseFloat(cols[qtyIdx] ?? '0')
    if (!cols[nameIdx] || !cols[recipeIdx] || isNaN(qty) || qty <= 0) continue
    rows.push({
      type: type as 'ingredient' | 'output',
      recipe_name: cols[recipeIdx],
      name: cols[nameIdx],
      qty,
      unit: cols[unitIdx] || 'g',
    })
  }
  return rows
}

const CSV_TEMPLATE = `type,recipe_name,name,qty,unit
ingredient,My Recipe,Flour,500,g
ingredient,My Recipe,Sugar,200,g
output,My Recipe,Cake,1,pcs`

export default function RecipeListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ recipesCreated: number; materialsCreated: number; productsCreated: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  const params = new URLSearchParams()
  params.set('page', String(page))
  if (search) params.set('search', search)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['recipes', page, search],
    queryFn: () => apiFetch<ListResponse>(`/api/v1/recipes?${params}`, { token }),
    enabled: !!token,
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const text = await file.text()
    const rows = parseCsv(text)
    if (rows.length === 0) {
      setImportError('No valid rows found. Check your CSV format.')
      return
    }

    const freshToken = await refreshToken()
    if (!freshToken) return
    setImporting(true)
    setImportError(null)
    setImportResult(null)
    try {
      const result = await apiFetch<{ recipesCreated: number; materialsCreated: number; productsCreated: number }>(
        '/api/v1/recipes/import',
        { method: 'POST', body: JSON.stringify({ rows }), token: freshToken },
      )
      setImportResult(result)
      void queryClient.invalidateQueries({ queryKey: ['recipes'] })
      void queryClient.invalidateQueries({ queryKey: ['rawMaterials'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : 'Import failed. Try again.')
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recipe_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <LoadingSpinner />

  const recipes = data?.items ?? []

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      {/* Mobile header */}
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-semibold text-gray-900">{t('nav_recipes')}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="text-xs text-gray-600 border border-gray-200 bg-white px-2.5 py-1.5 rounded-lg disabled:opacity-50"
            >
              {importing ? 'Importing…' : 'Import'}
            </button>
            <button
              onClick={() => navigate('/recipes/new')}
              className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <h1 className="text-base font-semibold text-gray-900 flex-1">{t('nav_recipes')}</h1>
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={downloadTemplate}
          className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          Template
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {importing ? 'Importing…' : 'Import CSV'}
        </button>
        <button
          onClick={() => navigate('/recipes/new')}
          className="bg-brand-500 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-brand-600 transition-colors whitespace-nowrap"
        >
          + New recipe
        </button>
      </header>

      <div>
        {/* Import feedback */}
        {importResult && (
          <div className="mx-4 md:mx-6 mt-4 mb-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-emerald-800">Import successful</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {importResult.recipesCreated} recipe{importResult.recipesCreated !== 1 ? 's' : ''} added
                {importResult.materialsCreated > 0 ? ` · ${importResult.materialsCreated} new material${importResult.materialsCreated !== 1 ? 's' : ''}` : ''}
                {importResult.productsCreated > 0 ? ` · ${importResult.productsCreated} new product${importResult.productsCreated !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
            <button onClick={() => setImportResult(null)} className="text-emerald-400 hover:text-emerald-600 flex-shrink-0 text-lg leading-none">×</button>
          </div>
        )}
        {importError && (
          <div className="mx-4 md:mx-6 mt-4 mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
            <p className="text-sm text-red-700">{importError}</p>
            <button onClick={() => setImportError(null)} className="text-red-300 hover:text-red-500 flex-shrink-0 text-lg leading-none">×</button>
          </div>
        )}

        {/* Mobile list */}
        <div className="p-4 md:hidden space-y-3">
          {isError && <ErrorState onRetry={() => void refetch()} />}
          {!isError && !isLoading && recipes.length === 0 && (
            <EmptyState
              title="No recipes yet"
              description="A recipe bridges raw materials to products."
              actionLabel="Create first recipe"
              onAction={() => navigate('/recipes/new')}
            />
          )}
          {recipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
              className="w-full bg-white rounded-xl border border-gray-100 shadow-card p-4 text-left hover:border-brand-300 transition-colors"
            >
              <p className="text-sm font-semibold text-gray-900">{recipe.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''} →{' '}
                {recipe.outputs.length} output{recipe.outputs.length !== 1 ? 's' : ''}
              </p>
            </button>
          ))}
          {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
          <button
            onClick={() => navigate('/recipes/new')}
            className="w-full border-2 border-dashed border-brand-300 rounded-xl py-3 text-brand-600 text-sm font-medium"
          >
            + New recipe
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block px-6 py-5">
          {isError && <ErrorState onRetry={() => void refetch()} />}
          {!isError && !isLoading && recipes.length === 0 && (
            <EmptyState
              title="No recipes yet"
              description="A recipe bridges raw materials to products."
              actionLabel="Create first recipe"
              onAction={() => navigate('/recipes/new')}
            />
          )}
          {recipes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Ingredients</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Outputs</th>
                    <th className="px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recipes.map((recipe) => (
                    <tr
                      key={recipe.id}
                      onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{recipe.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {(recipe as any).type === 'YIELD_BREAKDOWN' ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Yield Breakdown</span>
                        ) : (
                          <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">Production</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">{recipe.ingredients.length}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">{recipe.outputs.length}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-brand-500 font-medium">Edit</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => void handleFileChange(e)}
        className="sr-only"
      />
    </div>
  )
}
