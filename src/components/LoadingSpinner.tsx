export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`border-[3px] border-slate-200 border-t-brand-500 rounded-full animate-spin ${className}`} />
  )
}

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Spinner className="w-8 h-8" />
    </div>
  )
}
