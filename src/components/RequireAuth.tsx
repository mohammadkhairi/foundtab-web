import { useAuth } from '@clerk/react'
import { Navigate } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <LoadingSpinner />
  if (!isSignedIn) return <Navigate to="/sign-in" replace />

  return <>{children}</>
}
