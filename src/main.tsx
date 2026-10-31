import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/react'
import App from './App'
import { env } from './config/env'
import { LangProvider } from './contexts/LangContext'
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext'
import { ApiError } from './lib/api'
import './index.css'

function handleOrgNotFound(error: unknown) {
  if (
    error instanceof ApiError &&
    error.status === 403 &&
    error.message.toLowerCase().includes('no organisation found')
  ) {
    localStorage.removeItem('ft-onboarding-done')
    window.location.replace('/onboarding')
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleOrgNotFound }),
  mutationCache: new MutationCache({ onError: handleOrgNotFound }),
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}>
      <LangProvider>
        <QueryClientProvider client={queryClient}>
          <FeatureFlagsProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </FeatureFlagsProvider>
        </QueryClientProvider>
      </LangProvider>
    </ClerkProvider>
  </React.StrictMode>,
)
