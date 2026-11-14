import { Navigate } from 'react-router-dom'
import { getStoredToken } from '../hooks/useAuth'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = getStoredToken()
  if (!token) return <Navigate to="/sign-in" replace />
  return <>{children}</>
}
