import type { ReactNode } from 'react'

type HelpDrawerProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  youtubeVideoId?: string
}

export default function HelpDrawer({ isOpen, onClose, title, children, youtubeVideoId }: HelpDrawerProps) {
  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {youtubeVideoId && (
            <div className="mb-4 rounded-xl overflow-hidden aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                title="Tutorial video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
          {children && <div className="text-sm text-gray-700 space-y-2">{children}</div>}
        </div>
      </div>
    </>
  )
}
