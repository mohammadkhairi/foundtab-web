import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { usePushSubscription } from '../../notifications/hooks/usePushSubscription'
import { useT } from '../../../hooks/useT'
import { useLang } from '../../../contexts/LangContext'

export default function NotificationSettingsPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const t = useT()
  const { lang, setLang } = useLang()
  const { state, subscribe } = usePushSubscription({ token })

  const isSubscribed = state === 'subscribed'
  const isDenied = state === 'denied'
  const isError = state === 'error'

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label={t('common_back')}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900">{t('settings_notifications')}</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Language section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900">{t('settings_language')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('settings_languageDesc')}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLang('en')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                lang === 'en' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t('settings_english')}
            </button>
            <button
              onClick={() => setLang('ms')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                lang === 'ms' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {t('settings_malay')}
            </button>
          </div>
        </div>

        {/* Push notifications section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{t('settings_pushNotif')}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('settings_pushNotifDesc')}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isSubscribed ? 'bg-emerald-100 text-emerald-700' :
              isDenied ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {isSubscribed ? t('settings_active') : isDenied ? t('settings_denied') : isError ? t('settings_notSupported') : t('settings_inactive')}
            </div>
          </div>

          {!isSubscribed && !isDenied && !isError && (
            <button
              onClick={() => void subscribe()}
              disabled={state === 'requesting'}
              className="w-full bg-brand-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60"
            >
              {state === 'requesting' ? t('settings_requestingPermission') : t('settings_enableNotif')}
            </button>
          )}

          {isDenied && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <p className="font-medium mb-0.5">{t('settings_notifDeniedTitle')}</p>
              <p>{t('settings_notifDeniedDesc')}</p>
            </div>
          )}

          {isError && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600">
              {t('settings_deviceNotSupport')}
            </div>
          )}
        </div>

        {/* Notification types section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('settings_notifTypes')}</p>
          {[
            { label: t('settings_lowStockAlert'), description: t('settings_lowStockAlertDesc') },
            { label: t('settings_newOrder'), description: t('settings_newOrderDesc') },
            { label: t('settings_weeklyReport'), description: t('settings_weeklyReportDesc') },
          ].map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-3 py-1">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.description}</p>
              </div>
              <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 ${isSubscribed ? 'bg-emerald-500' : 'bg-gray-200'} flex items-center justify-center`}>
                {isSubscribed && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Clear local data */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Clear app data</p>
            <p className="text-xs text-gray-500 mt-0.5">Clears cached drafts and local storage. Use after a DB reset.</p>
          </div>
          <button
            onClick={() => { localStorage.clear(); window.location.reload() }}
            className="w-full border border-red-200 text-red-500 font-medium py-2.5 rounded-xl text-sm hover:bg-red-50 transition-colors"
          >
            Clear local storage
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center px-4">
          {t('settings_privacyNote')}
        </p>
      </div>
    </div>
  )
}
