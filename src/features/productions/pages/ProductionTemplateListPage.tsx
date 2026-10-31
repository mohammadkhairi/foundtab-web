import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../hooks/useAuth'
import { apiFetch, ApiError } from '../../../lib/api'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorState from '../../../components/ErrorState'
import EmptyState from '../../../components/EmptyState'
import Pagination from '../../../components/Pagination'
import { useT } from '../../../hooks/useT'

type TemplateItem = { id: string; recipeId: string; batchCount: string; sortOrder: number }
type Template = { id: string; name: string; notes: string | null; scheduleType: string; items: TemplateItem[] }

type ListResponse = {
  items: Template[]
  total: number
  page: number
  pageSize: number
}

const SCHEDULE_COLORS: Record<string, string> = {
  daily: 'bg-emerald-100 text-emerald-700',
  weekly: 'bg-sky-100 text-sky-700',
  one_off: 'bg-purple-100 text-purple-700',
  as_needed: 'bg-gray-100 text-gray-600',
}

export default function ProductionTemplateListPage() {
  const navigate = useNavigate()
  const { token, refreshToken } = useAuth()
  const t = useT()
  const queryClient = useQueryClient()
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<{ templateName: string; count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['production-templates', page],
    queryFn: () => apiFetch<ListResponse>(`/api/v1/production-templates?page=${page}`, { token }),
    enabled: !!token,
  })
  const templates = data?.items

  const runMutation = useMutation({
    mutationFn: async (id: string) => {
      const freshToken = await refreshToken()
      if (!freshToken) throw new Error('No token')
      return apiFetch<{ templateName: string; productions: unknown[] }>(
        `/api/v1/production-templates/${id}/run`,
        { method: 'POST', token: freshToken },
      )
    },
    onSuccess: (data) => {
      setRunResult({ templateName: data.templateName, count: data.productions.length })
      void queryClient.invalidateQueries({ queryKey: ['productions'] })
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to run plan')
    },
    onSettled: () => setRunningId(null),
  })

  function scheduleLabel(type: string) {
    const key = `schedule_${type}` as Parameters<typeof t>[0]
    return t(key)
  }

  async function handleRun(id: string) {
    setError(null)
    setRunResult(null)
    setRunningId(id)
    runMutation.mutate(id)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8">
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sticky top-0 z-10 md:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Production Plans</h1>
          <button
            onClick={() => navigate('/production-templates/new')}
            className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </header>

      <div className="hidden md:flex items-center justify-between px-6 py-5">
        <h1 className="text-xl font-semibold text-gray-900">Production Plans</h1>
        <button
          onClick={() => navigate('/production-templates/new')}
          className="bg-sky-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors"
        >
          + New Plan
        </button>
      </div>

      <div className="p-4 md:px-6 md:pt-0 space-y-3">
        {runResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 flex items-center justify-between">
            <span>✓ Ran <strong>{runResult.templateName}</strong> — {runResult.count} production{runResult.count !== 1 ? 's' : ''} completed</span>
            <button onClick={() => setRunResult(null)} className="text-emerald-400 hover:text-emerald-600">✕</button>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
        )}

        {isError && <ErrorState onRetry={() => void refetch()} />}

        {!isError && !isLoading && !templates?.length && (
          <EmptyState
            title="No production plans yet"
            description="Save a plan to reuse it every batch day — set which recipes to make and how many batches."
            actionLabel="Create Plan"
            onAction={() => navigate('/production-templates/new')}
          />
        )}

        {templates?.map((tmpl) => (
          <div key={tmpl.id} className="bg-white rounded-xl border border-gray-100 shadow-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{tmpl.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCHEDULE_COLORS[tmpl.scheduleType] ?? SCHEDULE_COLORS.as_needed}`}>
                    {scheduleLabel(tmpl.scheduleType)}
                  </span>
                </div>
                {tmpl.notes && <p className="text-xs text-gray-400 mt-0.5">{tmpl.notes}</p>}
                <p className="text-xs text-gray-400 mt-1.5">
                  {tmpl.items.length} recipe{tmpl.items.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => navigate(`/production-templates/${tmpl.id}/edit`)}
                  className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => void handleRun(tmpl.id)}
                  disabled={runningId === tmpl.id}
                  className="text-xs bg-sky-500 text-white px-3 py-1.5 rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-60 font-medium"
                >
                  {runningId === tmpl.id ? 'Running...' : '▶ Run'}
                </button>
              </div>
            </div>
          </div>
        ))}

        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}

        {!templates?.length || (
          <button
            onClick={() => navigate('/production-templates/new')}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-sky-300 hover:text-sky-500 transition-colors md:hidden"
          >
            + New Plan
          </button>
        )}
      </div>
    </div>
  )
}
