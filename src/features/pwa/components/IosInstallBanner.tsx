import { useState, useEffect } from 'react'

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export default function IosInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('ios-install-dismissed')
    if (isIos() && !isInStandaloneMode() && !dismissed) {
      setShow(true)
    }
  }, [])

  function handleDismiss() {
    localStorage.setItem('ios-install-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg z-30">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Pasang FoundTab</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Ketik <strong>Kongsi</strong> kemudian pilih <strong>Tambah ke Skrin Utama</strong> untuk akses lebih mudah.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 text-lg leading-none p-1"
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
