export default function DesktopPageHeader({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <header className="hidden md:flex items-center gap-3 bg-white border-b border-gray-200 px-6 h-14 sticky top-0 z-10">
      <h1 className="text-base font-semibold text-gray-900 flex-1">{title}</h1>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  )
}
