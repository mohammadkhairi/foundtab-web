import { Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import BottomNav from './components/BottomNav'
import DesktopSidebar from './components/DesktopSidebar'
import SignInPage from './features/auth/pages/SignInPage'
import SignUpPage from './features/auth/pages/SignUpPage'
import OnboardingFlow, { isOnboardingDone } from './features/onboarding/OnboardingFlow'
import DashboardPage from './features/dashboard/pages/DashboardPage'
import RawMaterialListPage from './features/rawMaterials/pages/RawMaterialListPage'
import RawMaterialFormPage from './features/rawMaterials/pages/RawMaterialFormPage'
import PurchaseListPage from './features/purchases/pages/PurchaseListPage'
import PurchaseFormPage from './features/purchases/pages/PurchaseFormPage'
import PurchaseDetailPage from './features/purchases/pages/PurchaseDetailPage'
import OcrReviewPage from './features/purchases/pages/OcrReviewPage'
import ProductListPage from './features/products/pages/ProductListPage'
import ProductFormPage from './features/products/pages/ProductFormPage'
import RecipeListPage from './features/recipes/pages/RecipeListPage'
import RecipeFormPage from './features/recipes/pages/RecipeFormPage'
import MenuListPage from './features/menu/pages/MenuListPage'
import MenuFormPage from './features/menu/pages/MenuFormPage'
import ProductionFormPage from './features/productions/pages/ProductionFormPage'
import ProductionHistoryPage from './features/productions/pages/ProductionHistoryPage'
import ProductionTemplateListPage from './features/productions/pages/ProductionTemplateListPage'
import ProductionTemplateFormPage from './features/productions/pages/ProductionTemplateFormPage'
import OrderListPage from './features/orders/pages/OrderListPage'
import OrderFormPage from './features/orders/pages/OrderFormPage'
import OrderDetailPage from './features/orders/pages/OrderDetailPage'
import WhatsAppOrderPage from './features/orders/pages/WhatsAppOrderPage'
import StockMovementHistoryPage from './features/stockMovements/pages/StockMovementHistoryPage'
import NotificationSettingsPage from './features/settings/pages/NotificationSettingsPage'
import DataExportPage from './features/export/pages/DataExportPage'
import WastagePage from './features/wastage/pages/WastagePage'

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex min-h-screen bg-slate-50">
      <DesktopSidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

function ProtectedShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  )
}

function RootRedirect() {
  const onboardingDone = isOnboardingDone()
  return <Navigate to={onboardingDone ? '/dashboard' : '/onboarding'} replace />
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Root redirect — protected */}
      <Route path="/" element={<RequireAuth><RootRedirect /></RequireAuth>} />

      {/* Onboarding — protected, no bottom nav */}
      <Route path="/onboarding" element={<RequireAuth><OnboardingFlow /></RequireAuth>} />

      {/* Dashboard */}
      <Route path="/dashboard" element={<ProtectedShell><DashboardPage /></ProtectedShell>} />

      {/* Raw materials */}
      <Route path="/raw-materials" element={<ProtectedShell><RawMaterialListPage /></ProtectedShell>} />
      <Route path="/raw-materials/new" element={<ProtectedShell><RawMaterialFormPage /></ProtectedShell>} />
      <Route path="/raw-materials/:id/edit" element={<ProtectedShell><RawMaterialFormPage /></ProtectedShell>} />

      {/* Purchases */}
      <Route path="/purchases" element={<ProtectedShell><PurchaseListPage /></ProtectedShell>} />
      <Route path="/purchases/scan" element={<ProtectedShell><OcrReviewPage /></ProtectedShell>} />
      <Route path="/purchases/new" element={<ProtectedShell><PurchaseFormPage /></ProtectedShell>} />
      <Route path="/purchases/:id" element={<ProtectedShell><PurchaseDetailPage /></ProtectedShell>} />

      {/* Products */}
      <Route path="/products" element={<ProtectedShell><ProductListPage /></ProtectedShell>} />
      <Route path="/products/new" element={<ProtectedShell><ProductFormPage /></ProtectedShell>} />
      <Route path="/products/:id/edit" element={<ProtectedShell><ProductFormPage /></ProtectedShell>} />

      {/* Recipes */}
      <Route path="/recipes" element={<ProtectedShell><RecipeListPage /></ProtectedShell>} />
      <Route path="/recipes/new" element={<ProtectedShell><RecipeFormPage /></ProtectedShell>} />
      <Route path="/recipes/:id/edit" element={<ProtectedShell><RecipeFormPage /></ProtectedShell>} />

      {/* Catalogue */}
      <Route path="/catalogue" element={<ProtectedShell><MenuListPage /></ProtectedShell>} />
      <Route path="/catalogue/new" element={<ProtectedShell><MenuFormPage /></ProtectedShell>} />
      <Route path="/catalogue/:id/edit" element={<ProtectedShell><MenuFormPage /></ProtectedShell>} />

      {/* Productions */}
      <Route path="/productions" element={<ProtectedShell><ProductionHistoryPage /></ProtectedShell>} />
      <Route path="/productions/new" element={<ProtectedShell><ProductionFormPage /></ProtectedShell>} />
      <Route path="/production-templates" element={<ProtectedShell><ProductionTemplateListPage /></ProtectedShell>} />
      <Route path="/production-templates/new" element={<ProtectedShell><ProductionTemplateFormPage /></ProtectedShell>} />
      <Route path="/production-templates/:id/edit" element={<ProtectedShell><ProductionTemplateFormPage /></ProtectedShell>} />

      {/* Orders */}
      <Route path="/orders" element={<ProtectedShell><OrderListPage /></ProtectedShell>} />
      <Route path="/orders/new" element={<ProtectedShell><OrderFormPage /></ProtectedShell>} />
      <Route path="/orders/whatsapp" element={<ProtectedShell><WhatsAppOrderPage /></ProtectedShell>} />
      <Route path="/orders/:id" element={<ProtectedShell><OrderDetailPage /></ProtectedShell>} />

      {/* Stock movements */}
      <Route path="/stock-movements" element={<ProtectedShell><StockMovementHistoryPage /></ProtectedShell>} />

      {/* Wastage */}
      <Route path="/wastage" element={<ProtectedShell><WastagePage /></ProtectedShell>} />

      {/* Settings */}
      <Route path="/settings/notifications" element={<ProtectedShell><NotificationSettingsPage /></ProtectedShell>} />

      {/* Export */}
      <Route path="/export" element={<ProtectedShell><DataExportPage /></ProtectedShell>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
