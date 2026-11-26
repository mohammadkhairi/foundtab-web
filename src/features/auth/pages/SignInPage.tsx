import { useState } from 'react'
import { env } from '../../../config/env'
import { setStoredToken } from '../../../hooks/useAuth'
import { useT } from '../../../hooks/useT'

export default function SignInPage() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${env.VITE_API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json()) as { token?: string; message?: string }
      if (!res.ok) {
        const msg = data.message?.toUpperCase()
        if (msg === 'UNAUTHORISED' || msg === 'UNAUTHORIZED' || res.status === 401) {
          setError(t('auth_errorInvalidCredentials'))
        } else {
          setError(t('auth_errorServer'))
        }
        return
      }
      if (data.token) {
        setStoredToken(data.token)
        window.location.replace('/')
      }
    } catch {
      setError(t('auth_errorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900">FoundTab</h1>
        <p className="text-gray-500 mt-1 text-sm">{t('auth_tagline')}</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">{t('auth_signInHeading')}</h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth_emailLabel')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth_emailPlaceholder')}
              required
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('auth_passwordLabel')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-brand-600 transition-colors disabled:opacity-60"
          >
            {loading ? t('auth_signingIn') : t('auth_signInButton')}
          </button>
        </form>
      </div>

      <p className="mt-4 text-xs text-gray-400 text-center">
        {t('auth_noAccountFooter')}
      </p>
    </div>
  )
}
