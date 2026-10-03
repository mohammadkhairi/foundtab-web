import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { apiFetch } from '../../lib/api'
import { usePushSubscription } from '../notifications/hooks/usePushSubscription'
import AndroidInstallPrompt from '../pwa/components/AndroidInstallPrompt'
import IosInstallBanner from '../pwa/components/IosInstallBanner'

type OnboardingStep = 'org' | 'pwa' | 'notifications' | 'done'

type OrgFormData = {
  name: string
  registrationNumber: string
  industry: string
}

const INDUSTRIES = [
  { value: 'food', label: 'Makanan & Minuman' },
  { value: 'retail', label: 'Runcit' },
  { value: 'services', label: 'Perkhidmatan' },
  { value: 'other', label: 'Lain-lain' },
]

function OrgStep({ onNext }: { onNext: () => void }) {
  const { token } = useAuth()
  const [form, setForm] = useState<OrgFormData>({ name: '', registrationNumber: '', industry: 'food' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function updateField(field: keyof OrgFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Nama perniagaan diperlukan.')
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
        }),
        token,
      })
      onNext()
    } catch {
      setError('Gagal mencipta organisasi. Sila cuba lagi.')
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
        <h1 className="text-xl font-bold text-gray-900">Selamat datang ke FoundTab</h1>
        <p className="text-sm text-gray-500 mt-1">Isikan maklumat perniagaan anda untuk bermula.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="org-name">
            Nama perniagaan <span className="text-red-500">*</span>
          </label>
          <input
            id="org-name"
            type="text"
            value={form.name}
            onChange={updateField('name')}
            placeholder="Cth: Dapur Mak Weh"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reg-num">
            No. pendaftaran perniagaan <span className="text-gray-400">(pilihan)</span>
          </label>
          <input
            id="reg-num"
            type="text"
            value={form.registrationNumber}
            onChange={updateField('registrationNumber')}
            placeholder="Cth: 202301234567"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="industry">
            Industri
          </label>
          <select
            id="industry"
            value={form.industry}
            onChange={updateField('industry')}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind.value} value={ind.value}>
                {ind.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
        >
          {loading ? 'Menyimpan...' : 'Teruskan'}
        </button>
      </form>
    </div>
  )
}

function PwaStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="px-4 py-8 max-w-sm mx-auto">
      <div className="mb-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Pasang apl di telefon anda</h2>
        <p className="text-sm text-gray-500 mt-1">
          Akses FoundTab terus dari skrin utama — tiada perlu buka pelayar setiap kali.
        </p>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 space-y-2 mb-6">
        <p className="font-medium text-gray-800">Untuk iOS (iPhone/iPad):</p>
        <p>Ketik ikon <strong>Kongsi</strong> di bawah pelayar, kemudian pilih <strong>Tambah ke Skrin Utama</strong>.</p>
        <p className="font-medium text-gray-800 pt-1">Untuk Android:</p>
        <p>Ketik butang <strong>Pasang</strong> yang muncul di bawah skrin.</p>
      </div>

      <AndroidInstallPrompt />
      <IosInstallBanner />

      <button
        onClick={onNext}
        className="w-full bg-sky-500 text-white font-semibold py-3 rounded-xl text-sm"
      >
        Teruskan
      </button>
      <button
        onClick={onNext}
        className="w-full text-gray-400 text-sm py-2 mt-1"
      >
        Langkau buat masa ini
      </button>
    </div>
  )
}

function NotificationsStep({ onNext }: { onNext: () => void }) {
  const { token } = useAuth()
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
        <h2 className="text-xl font-bold text-gray-900">Hidupkan notifikasi</h2>
        <p className="text-sm text-gray-500 mt-1">
          Dapatkan amaran stok rendah dan kemas kini pesanan terus di telefon anda.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 mb-6 space-y-1">
        <p className="font-medium">Anda akan diberitahu apabila:</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700">
          <li>Stok bahan mentah mencapai paras rendah</li>
          <li>Pesanan baharu diterima</li>
          <li>Laporan mingguan sedia</li>
        </ul>
      </div>

      {state === 'denied' && (
        <p className="text-sm text-red-600 mb-3 text-center">
          Notifikasi telah dinafikan. Hidupkan semula dalam tetapan pelayar anda.
        </p>
      )}

      {state === 'error' && (
        <p className="text-sm text-red-600 mb-3 text-center">
          Peranti anda tidak menyokong notifikasi.
        </p>
      )}

      <button
        onClick={handleEnable}
        disabled={state === 'requesting'}
        className="w-full bg-amber-400 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 mb-2"
      >
        {state === 'requesting' ? 'Meminta kebenaran...' : 'Hidupkan notifikasi'}
      </button>
      <button
        onClick={onNext}
        className="w-full text-gray-400 text-sm py-2"
      >
        Tidak, terima kasih
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
  const [step, setStep] = useState<OnboardingStep>('org')

  function next(from: OnboardingStep) {
    const order: OnboardingStep[] = ['org', 'pwa', 'notifications', 'done']
    const idx = order.indexOf(from)
    const nextStep = order[idx + 1] ?? 'done'
    if (nextStep === 'done') {
      localStorage.setItem(ONBOARDING_DONE_KEY, '1')
      navigate('/dashboard')
    } else {
      setStep(nextStep)
    }
  }

  const progressSteps = ['org', 'pwa', 'notifications'] as const

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-center pt-4 pb-2">
        {progressSteps.map((s, i) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full mx-1 transition-colors ${
              step === s ? 'bg-sky-500' : i < progressSteps.indexOf(step as (typeof progressSteps)[number]) ? 'bg-sky-200' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {step === 'org' && <OrgStep onNext={() => next('org')} />}
      {step === 'pwa' && <PwaStep onNext={() => next('pwa')} />}
      {step === 'notifications' && <NotificationsStep onNext={() => next('notifications')} />}
    </div>
  )
}
