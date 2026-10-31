import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'
import { usePushSubscription } from '../notifications/hooks/usePushSubscription'
import AndroidInstallPrompt from '../pwa/components/AndroidInstallPrompt'
import IosInstallBanner from '../pwa/components/IosInstallBanner'
import { useT } from '../../hooks/useT'
import { useLang } from '../../contexts/LangContext'

type OnboardingStep = 'lang' | 'org' | 'pwa' | 'notifications' | 'done'

type OrgFormData = {
  name: string
  registrationNumber: string
  industry: string
  subIndustry: string
}

function LangStep({ onNext }: { onNext: () => void }) {
  const { lang, setLang } = useLang()
  const t = useT()

  function choose(l: 'en' | 'ms') {
    setLang(l)
    onNext()
  }

  return (
    <div className="px-4 py-8 max-w-sm mx-auto">
      <div className="mb-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{t('onboarding_chooseLanguage')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('onboarding_chooseLanguageDesc')}</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => choose('en')}
          className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all ${
            lang === 'en' ? 'border-sky-500 bg-sky-50' : 'border-gray-200 bg-white'
          }`}
        >
          <span className="text-2xl">🇬🇧</span>
          <div className="text-left">
            <p className={`text-sm font-semibold ${lang === 'en' ? 'text-sky-700' : 'text-gray-900'}`}>English</p>
            <p className="text-xs text-gray-400">English</p>
          </div>
          {lang === 'en' && (
            <svg className="w-5 h-5 text-sky-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <button
          onClick={() => choose('ms')}
          className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all ${
            lang === 'ms' ? 'border-sky-500 bg-sky-50' : 'border-gray-200 bg-white'
          }`}
        >
          <span className="text-2xl">🇲🇾</span>
          <div className="text-left">
            <p className={`text-sm font-semibold ${lang === 'ms' ? 'text-sky-700' : 'text-gray-900'}`}>Bahasa Melayu</p>
            <p className="text-xs text-gray-400">Malay</p>
          </div>
          {lang === 'ms' && (
            <svg className="w-5 h-5 text-sky-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

function OrgStep({ onNext }: { onNext: () => void }) {
  const { token } = useAuth()
  const t = useT()
  const [form, setForm] = useState<OrgFormData>({ name: '', registrationNumber: '', industry: 'food', subIndustry: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const INDUSTRIES: { value: string; label: string; subIndustries: string[] }[] = [
    {
      value: 'food',
      label: t('industry_food'),
      subIndustries: ['Bakery', 'Café / Coffee Shop', 'Restaurant', 'Catering', 'Cloud Kitchen', 'Food Truck', 'Pastry & Desserts', 'Beverage', 'Other F&B'],
    },
    {
      value: 'retail',
      label: t('industry_retail'),
      subIndustries: ['Fashion & Apparel', 'Electronics', 'Groceries', 'Health & Beauty', 'Home & Living', 'Toys & Gifts', 'Books & Stationery', 'Other Retail'],
    },
    {
      value: 'services',
      label: t('industry_services'),
      subIndustries: ['Cleaning', 'Beauty & Wellness', 'Laundry', 'Repair & Maintenance', 'Education & Tuition', 'Event & Photography', 'Logistics & Delivery', 'Other Services'],
    },
    {
      value: 'other',
      label: t('industry_other'),
      subIndustries: ['Other'],
    },
  ]

  const selectedIndustry = INDUSTRIES.find((i) => i.value === form.industry)
  const subIndustries = selectedIndustry?.subIndustries ?? []

  function updateField(field: keyof OrgFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(t('onboarding_businessNameRequired'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await apiFetch('/api/v1/orgs', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          registrationNumber: form.registrationNumber.trim() || undefined,
          industry: form.industry,
          subIndustry: form.subIndustry || undefined,
        }),
        token,
      })
      onNext()
    } catch {
      setError(t('onboarding_errorCreate'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-8 max-w-sm mx-auto">
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{t('onboarding_welcome')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('onboarding_fillDetails')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="org-name">
            {t('onboarding_businessName')} <span className="text-red-500">*</span>
          </label>
          <input
            id="org-name"
            type="text"
            value={form.name}
            onChange={updateField('name')}
            placeholder={t('onboarding_businessNamePlaceholder')}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reg-num">
            {t('onboarding_regNumber')} <span className="text-gray-400">({t('common_optional')})</span>
          </label>
          <input
            id="reg-num"
            type="text"
            value={form.registrationNumber}
            onChange={updateField('registrationNumber')}
            placeholder={t('onboarding_regNumberPlaceholder')}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="industry">
            {t('onboarding_industry')}
          </label>
          <select
            id="industry"
            value={form.industry}
            onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value, subIndustry: '' }))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind.value} value={ind.value}>
                {ind.label}
              </option>
            ))}
          </select>
        </div>

        {subIndustries.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sub-industry">
              {t('onboarding_subIndustry')} <span className="text-gray-400">({t('common_optional')})</span>
            </label>
            <select
              id="sub-industry"
              value={form.subIndustry}
              onChange={updateField('subIndustry')}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="">{t('onboarding_subIndustryPlaceholder')}</option>
              {subIndustries.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
        >
          {loading ? t('common_saving') : t('common_continue')}
        </button>
      </form>
    </div>
  )
}

function PwaStep({ onNext }: { onNext: () => void }) {
  const t = useT()
  return (
    <div className="px-4 py-8 max-w-sm mx-auto">
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t('onboarding_pwaTitle')}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('onboarding_pwaDesc')}
        </p>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 space-y-2 mb-6">
        <p className="font-medium text-gray-800">{t('onboarding_pwaIosTitle')}</p>
        <p>{t('onboarding_pwaIosSteps')}</p>
        <p className="font-medium text-gray-800 pt-1">{t('onboarding_pwaAndroidTitle')}</p>
        <p>{t('onboarding_pwaAndroidSteps')}</p>
      </div>

      <AndroidInstallPrompt />
      <IosInstallBanner />

      <button
        onClick={onNext}
        className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm"
      >
        {t('common_continue')}
      </button>
      <button
        onClick={onNext}
        className="w-full text-gray-400 text-sm py-2 mt-1"
      >
        {t('common_skip')}
      </button>
    </div>
  )
}

function NotificationsStep({ onNext }: { onNext: () => void }) {
  const { token } = useAuth()
  const t = useT()
  const { state, subscribe } = usePushSubscription({ token })

  async function handleEnable() {
    await subscribe()
    onNext()
  }

  return (
    <div className="px-4 py-8 max-w-sm mx-auto">
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t('onboarding_notifTitle')}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('onboarding_notifDesc')}
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 mb-6 space-y-1">
        <p className="font-medium">{t('onboarding_notifWhenTitle')}</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700">
          <li>{t('onboarding_notifLowStock')}</li>
          <li>{t('onboarding_notifNewOrder')}</li>
          <li>{t('onboarding_notifWeeklyReport')}</li>
        </ul>
      </div>

      {state === 'denied' && (
        <p className="text-sm text-red-600 mb-3 text-center">
          {t('onboarding_notifDenied')}
        </p>
      )}

      {state === 'error' && (
        <p className="text-sm text-red-600 mb-3 text-center">
          {t('onboarding_notifError')}
        </p>
      )}

      <button
        onClick={handleEnable}
        disabled={state === 'requesting'}
        className="w-full bg-amber-400 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 mb-2"
      >
        {state === 'requesting' ? t('onboarding_notifRequesting') : t('onboarding_notifEnable')}
      </button>
      <button
        onClick={onNext}
        className="w-full text-gray-400 text-sm py-2"
      >
        {t('common_noThanks')}
      </button>
    </div>
  )
}

const ONBOARDING_DONE_KEY = 'ft-onboarding-done'

export function isOnboardingDone(): boolean {
  return localStorage.getItem(ONBOARDING_DONE_KEY) === '1'
}

export default function OnboardingFlow() {
  const navigate = useNavigate()
  const [step, setStep] = useState<OnboardingStep>('lang')

  function next(from: OnboardingStep) {
    const order: OnboardingStep[] = ['lang', 'org', 'pwa', 'notifications', 'done']
    const idx = order.indexOf(from)
    const nextStep = order[idx + 1] ?? 'done'
    if (nextStep === 'done') {
      localStorage.setItem(ONBOARDING_DONE_KEY, '1')
      navigate('/dashboard')
    } else {
      setStep(nextStep)
    }
  }

  const progressSteps = ['lang', 'org', 'pwa', 'notifications'] as const
  const currentIdx = progressSteps.indexOf(step as (typeof progressSteps)[number])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex justify-center pt-4 pb-2">
        {progressSteps.map((s, i) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full mx-1 transition-colors ${
              i === currentIdx ? 'bg-sky-500' : i < currentIdx ? 'bg-sky-200' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {step === 'lang' && <LangStep onNext={() => next('lang')} />}
      {step === 'org' && <OrgStep onNext={() => next('org')} />}
      {step === 'pwa' && <PwaStep onNext={() => next('pwa')} />}
      {step === 'notifications' && <NotificationsStep onNext={() => next('notifications')} />}
    </div>
  )
}
