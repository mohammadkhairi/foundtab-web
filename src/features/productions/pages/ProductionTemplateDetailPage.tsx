import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorState from '../../../components/ErrorState'
import { useT } from '../../../hooks/useT'

type ScheduleEntry = {
  id: string
  templateId: string
  orgId: string
  scheduledDate: string
  status: 'scheduled' | 'skipped' | 'completed'
  completedAt: string | null
}

type TemplateItem = {
  id: string
  recipeId: string
  batchCount: string
  sortOrder: number
}

type RecipeInfo = {
  id: string
  name: string
}

type Template = {
  id: string
  name: string
  notes: string | null
  scheduleType: 'as_needed' | 'daily' | 'weekly' | 'one_off'
  scheduledDayOfWeek: number | null
  scheduledDate: string | null
  isTimetableActive: boolean
  items: TemplateItem[]
  scheduleEntries: ScheduleEntry[]
}

const SCHEDULE_COLORS: Record<string, string> = {
  daily: 'bg-emerald-100 text-emerald-700',
  weekly: 'bg-brand-100 text-brand-700',
  one_off: 'bg-purple-100 text-purple-700',
  as_needed: 'bg-gray-100 text-gray-600',
}

type Tab = 'overview' | 'schedule'

function formatEntryDate(scheduledDate: string): string {
  return new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function StatusBadge({ status }: { status: ScheduleEntry['status'] }) {
  if (status === 'completed') {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        Completed
      </span>
    )
  }
  if (status === 'skipped') {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
        Skipped
      </span>
    )
  }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
      Scheduled
    </span>
  )
}

export default function ProductionTemplateDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [runResult, setRunResult] = useState<{ templateName: string; count: number } | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data: template, isLoading, isError, refetch } = useQuery({
    queryKey: ['production-template', id],
    queryFn: () => apiFetch<Template>(`/api/v1/production-templates/${id}`, { token }),
    enabled: !!token && !!id,
  })

  // Fetch recipe names for items
  const { data: recipesData } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<{ items: RecipeInfo[] }>('/api/v1/recipes', { token }),
    enabled: !!token,
  })
  const recipes = recipesData?.items ?? []

  const runMutation = useMutation({
    mutationFn: async () => {
      const freshToken = await refreshToken()
      if (!freshToken) throw new Error('No token')
      return apiFetch<{ templateName: string; productions: unknown[] }>(
        `/api/v1/production-templates/${id}/run`,
        { method: 'POST', token: freshToken },
      )
    },
    onSuccess: (data) => {
      setRunResult({ templateName: data.templateName, count: data.productions.length })
      setRunError(null)
      void queryClient.invalidateQueries({ queryKey: ['productions'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      setRunError(err instanceof ApiError ? err.message : 'Failed to run plan')
    },
  })

  const toggleTimetableMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const freshToken = await refreshToken()
      if (!freshToken) throw new Error('No token')
      return apiFetch(`/api/v1/production-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isTimetableActive: active }),
        token: freshToken,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['production-template', id] })
      setActionError(null)
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update timetable')
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const freshToken = await refreshToken()
      if (!freshToken) throw new Error('No token')
      return apiFetch(`/api/v1/production-templates/${id}/schedule/regenerate`, {
        method: 'POST',
        token: freshToken,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['production-template', id] })
      setActionError(null)
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : 'Failed to regenerate schedule')
    },
  })

  const patchEntryMutation = useMutation({
    mutationFn: async ({ entryId, status }: { entryId: string; status: 'skipped' | 'scheduled' }) => {
      const freshToken = await refreshToken()
      if (!freshToken) throw new Error('No token')
      return apiFetch(`/api/v1/production-templates/${id}/schedule/${entryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        token: freshToken,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['production-template', id] })
      setActionError(null)
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : 'Failed to update entry')
    },
  })

  const runEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const freshToken = await refreshToken()
      if (!freshToken) throw new Error('No token')
      return apiFetch<{ templateName: string; productions: unknown[] }>(
        `/api/v1/production-templates/${id}/schedule/${entryId}/run`,
        { method: 'POST', token: freshToken },
      )
    },
    onSuccess: (data) => {
      setRunResult({ templateName: data.templateName, count: data.productions.length })
      setActionError(null)
      void queryClient.invalidateQueries({ queryKey: ['production-template', id] })
      void queryClient.invalidateQueries({ queryKey: ['productions'] })
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : 'Failed to run entry')
    },
  })

  if (isLoading) return <LoadingSpinner />
  if (isError || !template) return <ErrorState onRetry={() => void refetch()} />

  const isScheduled = template.scheduleType !== 'as_needed'
  const scheduleColorClass = SCHEDULE_COLORS[template.scheduleType] ?? SCHEDULE_COLORS.as_needed
  const scheduleLabel = t(`schedule_${template.scheduleType}` as Parameters<typeof t>[0])

  function getRecipeName(recipeId: string) {
    return recipes.find((r) => r.id === recipeId)?.name ?? recipeId
  }

  const timetableToggle = isScheduled ? (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className={`text-sm font-medium ${template.isTimetableActive ? 'text-emerald-700' : 'text-amber-700'}`}>
          {template.isTimetableActive ? 'Timetable is active' : 'Timetable is paused'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {template.isTimetableActive
            ? 'Upcoming runs are scheduled automatically'
            : 'No new runs will be scheduled while paused'}
        </p>
      </div>
      <button
        onClick={() => toggleTimetableMutation.mutate(!template.isTimetableActive)}
        disabled={toggleTimetableMutation.isPending}
        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
          template.isTimetableActive
            ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'
            : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
        }`}
      >
        {toggleTimetableMutation.isPending
          ? '...'
          : template.isTimetableActive
          ? 'Pause'
          : 'Resume'}
      </button>
    </div>
  ) : null

  const overviewContent = (
    <div className="space-y-4">
      {runResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 flex items-center justify-between">
          <span>
            Ran <strong>{runResult.templateName}</strong> — {runResult.count} production
            {runResult.count !== 1 ? 's' : ''} completed
          </span>
          <button onClick={() => setRunResult(null)} className="text-emerald-400 hover:text-emerald-600 ml-2">
            ✕
          </button>
        </div>
      )}
      {runError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{runError}</div>
      )}

      {/* Plan info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-base">{template.name}</p>
            {template.notes && <p className="text-sm text-gray-500 mt-1">{template.notes}</p>}
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${scheduleColorClass}`}>
            {scheduleLabel}
          </span>
        </div>
      </div>

      {/* Timetable toggle */}
      {isScheduled && timetableToggle && (
        <div className={`rounded-xl border p-4 ${template.isTimetableActive ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          {timetableToggle}
        </div>
      )}

      {/* Recipes */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">Recipes</p>
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden divide-y divide-gray-50">
          {template.items.length === 0 ? (
            <p className="p-4 text-sm text-gray-400">No recipes added</p>
          ) : (
            template.items.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">
                  {getRecipeName(item.recipeId)}
                </p>
                <p className="text-sm text-gray-500 shrink-0">
                  × {item.batchCount} batch{parseFloat(item.batchCount) !== 1 ? 'es' : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          className="w-full bg-emerald-500 text-white font-semibold py-3 rounded-xl text-sm hover:bg-emerald-600 transition-colors disabled:opacity-60"
        >
          {runMutation.isPending ? 'Running...' : '▶ Run now'}
        </button>
        <button
          onClick={() => navigate(`/production-templates/${id}/edit`)}
          className="w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          Edit plan
        </button>
      </div>
    </div>
  )

  const sortedEntries = [...(template.scheduleEntries ?? [])].sort(
    (a, b) => a.scheduledDate.localeCompare(b.scheduledDate),
  )

  const scheduleContent = (
    <div className="space-y-4">
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{actionError}</div>
      )}
      {runResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 flex items-center justify-between">
          <span>
            Ran <strong>{runResult.templateName}</strong> — {runResult.count} production
            {runResult.count !== 1 ? 's' : ''} completed
          </span>
          <button onClick={() => setRunResult(null)} className="text-emerald-400 hover:text-emerald-600 ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Timetable toggle */}
      {timetableToggle && (
        <div className={`rounded-xl border p-4 ${template.isTimetableActive ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          {timetableToggle}
        </div>
      )}

      {/* Regenerate */}
      <button
        onClick={() => regenerateMutation.mutate()}
        disabled={regenerateMutation.isPending}
        className="w-full border border-brand-300 text-brand-700 font-medium py-2.5 rounded-xl text-sm hover:bg-brand-50 transition-colors disabled:opacity-60"
      >
        {regenerateMutation.isPending ? 'Regenerating...' : '↻ Regenerate schedule'}
      </button>

      {/* Empty states */}
      {!template.isTimetableActive ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 text-center">
          <p className="text-sm text-gray-400">Timetable is paused. Enable it to see upcoming runs.</p>
        </div>
      ) : sortedEntries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 text-center">
          <p className="text-sm text-gray-400">
            No upcoming entries — click Regenerate to create them.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden divide-y divide-gray-50">
          {sortedEntries.map((entry) => (
            <div key={entry.id} className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{formatEntryDate(entry.scheduledDate)}</p>
                  <StatusBadge status={entry.status} />
                </div>
                {entry.status === 'completed' && (
                  <span className="text-emerald-500 text-base" aria-label="Completed">✓</span>
                )}
              </div>
              {entry.status === 'scheduled' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => patchEntryMutation.mutate({ entryId: entry.id, status: 'skipped' })}
                    disabled={patchEntryMutation.isPending}
                    className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => runEntryMutation.mutate(entry.id)}
                    disabled={runEntryMutation.isPending}
                    className="text-xs bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-60 font-medium"
                  >
                    {runEntryMutation.isPending ? '...' : '▶ Run'}
                  </button>
                </div>
              )}
              {entry.status === 'skipped' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => patchEntryMutation.mutate({ entryId: entry.id, status: 'scheduled' })}
                    disabled={patchEntryMutation.isPending}
                    className="text-xs border border-brand-300 text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-60"
                  >
                    Undo skip
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const tabs = (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
      <button
        onClick={() => setActiveTab('overview')}
        className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors ${
          activeTab === 'overview'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Overview
      </button>
      {isScheduled && (
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors ${
            activeTab === 'schedule'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Schedule
        </button>
      )}
    </div>
  )

  const backArrow = (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-brand-50 pb-20 md:pb-8" data-tour="production-plan-detail">
      {/* Mobile header */}
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/production-templates')} className="text-gray-500">
            {backArrow}
          </button>
          <h1 className="text-base font-semibold text-gray-900 flex-1 truncate">{template.name}</h1>
        </div>
        {isScheduled && (
          <div className="mt-3">
            {tabs}
          </div>
        )}
      </header>

      {/* Desktop header */}
      <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
        <button onClick={() => navigate('/production-templates')} className="text-gray-400 hover:text-gray-600 transition-colors">
          {backArrow}
        </button>
        <h1 className="text-base font-semibold text-gray-900 flex-1 truncate">{template.name}</h1>
        {isScheduled && (
          <div className="w-64">
            {tabs}
          </div>
        )}
      </header>

      {/* Mobile layout */}
      <div className="md:hidden p-4">
        {activeTab === 'overview' || !isScheduled ? overviewContent : scheduleContent}
      </div>

      {/* Desktop layout */}
      <div className="hidden md:block md:max-w-2xl md:px-8 md:py-6">
        {activeTab === 'overview' || !isScheduled ? overviewContent : scheduleContent}
      </div>
    </div>
  )
}
