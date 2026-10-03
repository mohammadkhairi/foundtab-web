import { useState, useEffect } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function AndroidInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem('android-install-dismissed')
    if (alreadyDismissed) {
      setDismissed(true)
      return
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'dismissed') {
      localStorage.setItem('android-install-dismissed', '1')
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    localStorage.setItem('android-install-dismissed', '1')
    setDismissed(true)
  }

  if (dismissed || !deferredPrompt) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg z-30">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Pasang FoundTab</p>
          <p className="text-xs text-gray-500">Akses lebih pantas dari skrin utama anda.</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 text-sm px-2"
          aria-label="Tidak"
        >
          Tidak
        </button>
        <button
          onClick={handleInstall}
          className="bg-sky-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
        >
          Pasang
        </button>
      </div>
    </div>
  )
}
