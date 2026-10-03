import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { usePushSubscription } from '../../notifications/hooks/usePushSubscription'

export default function NotificationSettingsPage() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { state, subscribe } = usePushSubscription({ token })

  const isSubscribed = state === 'subscribed'
  const isDenied = state === 'denied'
  const isError = state === 'error'

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500" aria-label="Kembali">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-gray-900">Tetapan notifikasi</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Notifikasi tolak</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Terima amaran stok rendah dan kemas kini pesanan terus di peranti ini.
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              isSubscribed ? 'bg-emerald-100 text-emerald-700' :
              isDenied ? 'bg-red-100 text-red-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {isSubscribed ? 'Aktif' : isDenied ? 'Dinafikan' : isError ? 'Tidak disokong' : 'Tidak aktif'}
            </div>
          </div>

          {!isSubscribed && !isDenied && !isError && (
            <button
              onClick={() => void subscribe()}
              disabled={state === 'requesting'}
              className="w-full bg-sky-500 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60"
            >
              {state === 'requesting' ? 'Meminta kebenaran...' : 'Aktifkan notifikasi'}
            </button>
          )}

          {isDenied && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <p className="font-medium mb-0.5">Notifikasi telah dinafikan</p>
              <p>Hidupkan semula melalui tetapan pelayar anda: Tetapan &rarr; Privasi &rarr; Notifikasi.</p>
            </div>
          )}

          {isError && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600">
              Peranti atau pelayar anda tidak menyokong notifikasi tolak.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Jenis notifikasi</p>
          {[
            { label: 'Amaran stok rendah', description: 'Apabila bahan mentah mencapai paras amaran.' },
            { label: 'Pesanan baru', description: 'Apabila pesanan baru diterima.' },
            { label: 'Laporan mingguan', description: 'Ringkasan prestasi setiap Isnin.' },
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

        <p className="text-xs text-gray-400 text-center px-4">
          Notifikasi dihantar hanya ke peranti ini. Tiada e-mel dihantar tanpa persetujuan anda.
        </p>
      </div>
    </div>
  )
}
