import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clearStoredToken } from '../hooks/useAuth'
import { useT } from '../hooks/useT'
import { useFeatureFlags } from '../contexts/FeatureFlagsContext'

function HomeIcon({ size = 5 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function BoxIcon({ size = 5 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

function ShoppingBagIcon({ size = 5 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  )
}

function ShoppingCartIcon({ size = 5 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function PackageIcon({ size = 5 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  )
}

function ClipboardIcon({ size = 5 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function ChartIcon({ size = 5 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function CogIcon({ size = 5 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function TrashIcon({ size = 5 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function ReceiptIcon({ size = 5 }: { size?: number }) {
  return (
    <svg className={`w-${size} h-${size}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="w-3 h-3 ml-auto opacity-50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

type NavItem = {
  path: string
  label: string
  icon: React.ReactNode
  moduleKey?: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

export default function BottomNav() {
  const t = useT()
  const navigate = useNavigate()
  const { isAccessible, isLocked } = useFeatureFlags()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const PRIMARY: NavItem[] = [
    { path: '/dashboard', label: t('nav_home'), icon: <HomeIcon />, moduleKey: 'dashboard' },
    { path: '/purchases', label: t('nav_purchases'), icon: <ShoppingCartIcon />, moduleKey: 'purchases' },
    { path: '/orders', label: t('nav_orders'), icon: <ShoppingBagIcon />, moduleKey: 'orders' },
  ]

  const NAV_GROUPS: NavGroup[] = [
    {
      label: t('nav_home'),
      items: [
        { path: '/dashboard', label: t('nav_home'), icon: <HomeIcon size={4} />, moduleKey: 'dashboard' },
      ],
    },
    {
      label: t('nav_inventory'),
      items: [
        { path: '/raw-materials', label: t('nav_materials'), icon: <BoxIcon size={4} />, moduleKey: 'rawMaterials' },
        { path: '/purchases', label: t('nav_purchases'), icon: <ShoppingCartIcon size={4} />, moduleKey: 'purchases' },
        { path: '/products', label: t('nav_products'), icon: <PackageIcon size={4} />, moduleKey: 'products' },
        { path: '/wastage', label: t('nav_wastage'), icon: <TrashIcon size={4} />, moduleKey: 'wastageReport' },
        { path: '/stock-movements', label: t('nav_stockMovements'), icon: <ChartIcon size={4} />, moduleKey: 'rawMaterials' },
      ],
    },
    {
      label: 'Production',
      items: [
        { path: '/recipes', label: t('nav_recipes'), icon: <ClipboardIcon size={4} />, moduleKey: 'recipes' },
        { path: '/production-templates', label: t('nav_productionTemplates'), icon: <ClipboardIcon size={4} />, moduleKey: 'productions' },
        { path: '/productions', label: t('nav_productionLog'), icon: <ClipboardIcon size={4} />, moduleKey: 'productions' },
      ],
    },
    {
      label: t('nav_sales'),
      items: [
        { path: '/catalogue', label: t('nav_catalogue'), icon: <PackageIcon size={4} />, moduleKey: 'orders' },
        { path: '/orders', label: t('nav_orders'), icon: <ShoppingBagIcon size={4} />, moduleKey: 'orders' },
        { path: '/consignments', label: t('nav_consignments'), icon: <ClipboardIcon size={4} /> },
      ],
    },
    {
      label: t('nav_other'),
      items: [
        { path: '/billing', label: 'Billing', icon: <ReceiptIcon size={4} /> },
        { path: '/export', label: t('nav_export'), icon: <ChartIcon size={4} /> },
        { path: '/settings/notifications', label: t('nav_settings'), icon: <CogIcon size={4} /> },
      ],
    },
  ]

  function closeDrawer() {
    setDrawerOpen(false)
  }

  function handleNavClick(path: string) {
    navigate(path)
    closeDrawer()
  }

  function renderDrawerItem(item: NavItem) {
    if (item.moduleKey) {
      if (!isAccessible(item.moduleKey) && !isLocked(item.moduleKey)) return null

      if (isLocked(item.moduleKey)) {
        return (
          <button
            key={item.path}
            onClick={() => handleNavClick('/billing')}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-brand-800 opacity-50"
          >
            {item.icon}
            {item.label}
            <LockIcon />
          </button>
        )
      }
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={closeDrawer}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-brand-500 text-white'
              : 'text-brand-200 hover:bg-white/5 hover:text-white'
          }`
        }
      >
        {item.icon}
        {item.label}
      </NavLink>
    )
  }

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-100 z-20 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
        <div className="flex">
          {PRIMARY.map((item) => {
            const hidden = item.moduleKey && !isAccessible(item.moduleKey) && !isLocked(item.moduleKey)
            if (hidden) return null
            const locked = item.moduleKey ? isLocked(item.moduleKey) : false

            if (locked) {
              return (
                <button
                  key={item.path}
                  onClick={() => navigate('/billing')}
                  className="flex-1 flex flex-col items-center justify-center pt-2 pb-3 gap-1 relative text-gray-300 opacity-60"
                >
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              )
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center pt-2 pb-3 gap-1 transition-colors relative ${
                    isActive ? 'text-brand-600' : 'text-gray-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-brand-500" />
                    )}
                    {item.icon}
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}

          {/* Menu button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center pt-2 pb-3 gap-1 transition-colors ${
              drawerOpen ? 'text-brand-600' : 'text-gray-400'
            }`}
          >
            <MenuIcon />
            <span className="text-[10px] font-medium">{t('nav_more')}</span>
          </button>
        </div>
      </nav>

      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer panel — same styling as desktop sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-brand-950 z-40 md:hidden flex flex-col transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo + close */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-900 shrink-0">
          <img src="/logo.png" alt="FoundTab" className="h-8 object-contain" />
          <button
            onClick={closeDrawer}
            className="text-brand-500 hover:text-brand-300 p-1"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.map(renderDrawerItem).filter(Boolean)
            if (visibleItems.length === 0) return null
            return (
              <div key={group.label}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-brand-700 uppercase tracking-widest">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-brand-900 shrink-0">
          <button
            onClick={() => { clearStoredToken(); navigate('/sign-in'); closeDrawer() }}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-brand-600 hover:bg-white/5 hover:text-brand-400 transition-colors"
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
