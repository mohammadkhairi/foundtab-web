export default function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:bg-slate-200 md:min-h-screen md:flex md:items-start md:justify-center md:py-10">
      <div className="w-full md:w-[390px] md:min-h-[844px] md:rounded-[3rem] md:overflow-hidden md:shadow-2xl md:ring-1 md:ring-black/10 relative bg-gray-50">
        {children}
      </div>
    </div>
  )
}
