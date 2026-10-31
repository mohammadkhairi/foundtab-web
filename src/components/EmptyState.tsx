import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-5 w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
      {description && <p className="text-sm text-gray-400 mb-6 max-w-xs leading-relaxed">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-sky-500 text-white text-sm font-semibold rounded-lg hover:bg-sky-600 active:bg-sky-700 transition-colors shadow-sm"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
