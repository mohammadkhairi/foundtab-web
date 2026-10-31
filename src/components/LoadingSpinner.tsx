export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-7 h-7 border-[3px] border-slate-200 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )
}
