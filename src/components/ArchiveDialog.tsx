type Props = {
  title: string
  description: string
  usageLines?: string[]
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  confirming?: boolean
}

export default function ArchiveDialog({ title, description, usageLines = [], confirmLabel, onConfirm, onCancel, confirming }: Props) {
  const hasUsage = usageLines.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Icon + title */}
        <div className="p-6 pb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8M10 12v4M14 12v4" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>

        {/* In-use warning */}
        {hasUsage && (
          <div className="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 mb-1.5">Currently in use</p>
            <ul className="space-y-0.5">
              {usageLines.map((line, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="w-full bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {confirming
              ? (confirmLabel ? `${confirmLabel}...` : 'Archiving...')
              : confirmLabel
                ? (hasUsage ? `${confirmLabel} anyway` : confirmLabel)
                : (hasUsage ? 'Archive anyway' : 'Archive')}
          </button>
          <button
            onClick={onCancel}
            disabled={confirming}
            className="w-full bg-gray-100 text-gray-700 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
