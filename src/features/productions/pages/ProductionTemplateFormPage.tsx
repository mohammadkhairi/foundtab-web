import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { useT } from '../../../hooks/useT'

type Recipe = { id: string; name: string }
type ItemLine = { recipeId: string; name: string; batchCount: string }

type ScheduleType = 'one_off' | 'daily' | 'weekly' | 'as_needed'

const SCHEDULE_OPTIONS: { value: ScheduleType; labelKey: string; descKey: string }[] = [
  { value: 'as_needed', labelKey: 'schedule_as_needed', descKey: 'schedule_as_needed_desc' },
  { value: 'daily', labelKey: 'schedule_daily', descKey: 'schedule_daily_desc' },
  { value: 'weekly', labelKey: 'schedule_weekly', descKey: 'schedule_weekly_desc' },
  { value: 'one_off', labelKey: 'schedule_one_off', descKey: 'schedule_one_off_desc' },
]

const BackArrow = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

export default function ProductionTemplateFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('as_needed')
  const [items, setItems] = useState<ItemLine[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)

  const { data: recipesData } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<{ items: Recipe[] }>('/api/v1/recipes', { token }),
    enabled: !!token,
  })
  const recipes = recipesData?.items ?? []

  useEffect(() => {
    if (!isEdit || !token) return
    void apiFetch<{ name: string; notes: string | null; scheduleType: ScheduleType; items: Array<{ recipeId: string; batchCount: string }> }>(
      `/api/v1/production-templates/${id}`, { token },
    ).then((tmpl) => {
      setName(tmpl.name)
      setNotes(tmpl.notes ?? '')
      setScheduleType(tmpl.scheduleType ?? 'as_needed')
      setItems(tmpl.items.map((i) => ({
        recipeId: i.recipeId,
        name: recipes.find((r) => r.id === i.recipeId)?.name ?? i.recipeId,
        batchCount: i.batchCount,
      })))
      setLoading(false)
    }).catch(() => { setError('Failed to load plan'); setLoading(false) })
  }, [id, isEdit, token, recipes.length])

  function addRecipe(recipe: Recipe) {
    if (items.some((i) => i.recipeId === recipe.id)) return
    setItems((prev) => [...prev, { recipeId: recipe.id, name: recipe.name, batchCount: '1' }])
  }

  async function handleSave() {
    if (!name.trim()) { setError('Plan name is required'); return }
    if (items.length === 0) { setError('Add at least one recipe'); return }
    const freshToken = await refreshToken()
    if (!freshToken) return
    setSaving(true); setError(null)
    try {
      const payload = {
        name: name.trim(),
        notes: notes.trim() || undefined,
        scheduleType,
        items: items.map((i) => ({ recipeId: i.recipeId, batchCount: parseFloat(i.batchCount) || 1 })),
      }
      if (isEdit) {
        await apiFetch(`/api/v1/production-templates/${id}`, { method: 'PUT', body: JSON.stringify(payload), token: freshToken })
      } else {
        await apiFetch('/api/v1/production-templates', { method: 'POST', body: JSON.stringify(payload), token: freshToken })
      }
      void queryClient.invalidateQueries({ queryKey: ['production-templates'] })
      navigate('/production-templates')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500"><BackArrow /></button>
          <h1 className="text-base font-semibold text-gray-900 flex-1">
            {isEdit ? 'Edit Production Plan' : 'New Production Plan'}
          </h1>
        </div>
      </header>

      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors"><BackArrow /></button>
        <h1 className="text-base font-semibold text-gray-900 flex-1">
          {isEdit ? 'Edit Production Plan' : 'New Production Plan'}
        </h1>
      </header>

      <div className="md:max-w-4xl md:px-8 md:py-6">

        <div className="p-4 md:p-0 space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Plan name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Monday Batch, Weekend Production"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">{t('schedule_label')}</p>
              <div className="grid grid-cols-2 gap-2">
                {SCHEDULE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScheduleType(opt.value)}
                    className={`text-left px-3 py-2.5 rounded-lg border-2 transition-all ${
                      scheduleType === opt.value
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${scheduleType === opt.value ? 'text-sky-700' : 'text-gray-800'}`}>
                      {t(opt.labelKey as Parameters<typeof t>[0])}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t(opt.descKey as Parameters<typeof t>[0])}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes (optional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Start at 6am, check oven temp first"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Recipes</p>
            {items.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden divide-y divide-gray-100 mb-3">
                {items.map((item, idx) => (
                  <div key={item.recipeId} className="p-3 flex items-center gap-3">
                    <p className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">×</span>
                      <input
                        type="number" inputMode="decimal" min="0.1" step="0.5"
                        value={item.batchCount}
                        onChange={(e) => setItems((prev) => prev.map((l, i) => i === idx ? { ...l, batchCount: e.target.value } : l))}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
                        aria-label="Batches"
                      />
                      <span className="text-xs text-gray-400">batch</span>
                    </div>
                    <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-gray-300 hover:text-red-400 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
              <p className="text-xs font-medium text-gray-400 px-4 pt-3 pb-2">Add recipe</p>
              <ul className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
                {recipes.filter((r) => !items.some((i) => i.recipeId === r.id)).map((r) => (
                  <li key={r.id}>
                    <button onClick={() => addRecipe(r)}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-sky-50 hover:text-sky-700 transition-colors flex items-center gap-2">
                      <span className="text-sky-400 font-bold">+</span> {r.name}
                    </button>
                  </li>
                ))}
                {recipes.filter((r) => !items.some((i) => i.recipeId === r.id)).length === 0 && (
                  <li className="p-4 text-center text-sm text-gray-400">All recipes added</li>
                )}
              </ul>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button onClick={() => void handleSave()} disabled={saving}
            className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 hover:bg-sky-600 transition-colors">
            {saving ? 'Saving...' : 'Save Plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
