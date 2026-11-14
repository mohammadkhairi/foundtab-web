import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { env } from '../config/env'

export type Plan = 'TRIAL' | 'STARTER' | 'GROWTH' | 'ADVANCE' | 'PRO'

export type ModuleStatus = {
  key: string
  label: string
  requiredTier: Plan
  flagEnabled: boolean
  tierAccessible: boolean
  accessible: boolean
}

type FlagsResponse = {
  plan: Plan
  modules: ModuleStatus[]
}

type ContextValue = {
  plan: Plan
  modules: ModuleStatus[]
  loading: boolean
  isAccessible: (key: string) => boolean
  isLocked: (key: string) => boolean
}

const DEFAULT_MODULES: ModuleStatus[] = [
  { key: 'dashboard',    label: 'Summary Dashboard',   requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
  { key: 'purchases',    label: 'Purchases',            requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
  { key: 'rawMaterials', label: 'Raw Materials',        requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
  { key: 'products',     label: 'Products / SKU',       requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
  { key: 'recipes',      label: 'Recipes / Costing',    requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
  { key: 'orders',       label: 'Orders / Sales',       requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
  { key: 'productions',  label: 'Productions',          requiredTier: 'STARTER', flagEnabled: true,  tierAccessible: true,  accessible: true },
]

const DEFAULT_CTX: ContextValue = {
  plan: 'STARTER',
  modules: DEFAULT_MODULES,
  loading: true,
  isAccessible: () => true,
  isLocked: () => false,
}

const FeatureFlagsContext = createContext<ContextValue>(DEFAULT_CTX)

const isLocal = env.VITE_APP_ENV === 'local'

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const lastVersionRef = useRef<string | null>(null)

  // Main flags query — cached 60s in memory, browser HTTP cache also holds 60s
  const { data, isPending } = useQuery<FlagsResponse>({
    queryKey: ['feature-flags'],
    queryFn: () => apiFetch<FlagsResponse>('/api/v1/feature-flags', { token }),
    enabled: !!token,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 2,
  })

  // Version polling — only on staging/prod, every 10s
  // When portal changes flags or org plan, version bumps → immediate refetch
  const { data: versionData } = useQuery<{ version: string }>({
    queryKey: ['feature-flags-version'],
    queryFn: () => apiFetch<{ version: string }>('/api/v1/feature-flags/version', { token }),
    enabled: !!token && !isLocal,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 10_000,
    retry: false,
  })

  useEffect(() => {
    if (!versionData?.version) return
    if (lastVersionRef.current === null) {
      lastVersionRef.current = versionData.version
      return
    }
    if (versionData.version !== lastVersionRef.current) {
      lastVersionRef.current = versionData.version
      void queryClient.invalidateQueries({ queryKey: ['feature-flags'] })
    }
  }, [versionData?.version, queryClient])

  const plan = data?.plan ?? 'STARTER'
  const modules = data?.modules ?? DEFAULT_MODULES

  function isAccessible(key: string) {
    const mod = modules.find((m) => m.key === key)
    return mod?.accessible ?? false
  }

  function isLocked(key: string) {
    const mod = modules.find((m) => m.key === key)
    if (!mod) return false
    return mod.flagEnabled && !mod.tierAccessible
  }

  return (
    <FeatureFlagsContext.Provider value={{ plan, modules, loading: isPending, isAccessible, isLocked }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext)
}
