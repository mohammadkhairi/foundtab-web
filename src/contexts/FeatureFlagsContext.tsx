import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

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

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [plan, setPlan] = useState<Plan>('STARTER')
  const [modules, setModules] = useState<ModuleStatus[]>(DEFAULT_MODULES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    void apiFetch<FlagsResponse>('/api/v1/feature-flags', { token })
      .then((res) => {
        setPlan(res.plan)
        setModules(res.modules)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

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
    <FeatureFlagsContext.Provider value={{ plan, modules, loading, isAccessible, isLocked }}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext)
}
