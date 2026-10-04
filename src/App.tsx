import { Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import BottomNav from './components/BottomNav'
import SignInPage from './features/auth/pages/SignInPage'
import SignUpPage from './features/auth/pages/SignUpPage'
import OnboardingFlow, { isOnboardingDone } from './features/onboarding/OnboardingFlow'
import DashboardPage from './features/dashboard/pages/DashboardPage'
import RawMaterialListPage from './features/rawMaterials/pages/RawMaterialListPage'
import RawMaterialFormPage from './features/rawMaterials/pages/RawMaterialFormPage'
import PurchaseListPage from './features/purchases/pages/PurchaseListPage'
import PurchaseFormPage from './features/purchases/pages/PurchaseFormPage'
import OcrReviewPage from './features/purchases/pages/OcrReviewPage'
import ProductListPage from './features/products/pages/ProductListPage'
import ProductFormPage from './features/products/pages/ProductFormPage'
import RecipeBuilderPage from './features/products/pages/RecipeBuilderPage'
import ProductionFormPage from './features/productions/pages/ProductionFormPage'
import ProductionHistoryPage from './features/productions/pages/ProductionHistoryPage'
import OrderListPage from './features/orders/pages/OrderListPage'
import OrderFormPage from './features/orders/pages/OrderFormPage'
import OrderDetailPage from './features/orders/pages/OrderDetailPage'
import WhatsAppOrderPage from './features/orders/pages/WhatsAppOrderPage'
import StockMovementHistoryPage from './features/stockMovements/pages/StockMovementHistoryPage'
import NotificationSettingsPage from './features/settings/pages/NotificationSettingsPage'
import DataExportPage from './features/export/pages/DataExportPage'

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
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

      {/* Products */}
      <Route path="/products" element={<ProtectedShell><ProductListPage /></ProtectedShell>} />
      <Route path="/products/new" element={<ProtectedShell><ProductFormPage /></ProtectedShell>} />
      <Route path="/products/:id/edit" element={<ProtectedShell><ProductFormPage /></ProtectedShell>} />
      <Route path="/products/:id/recipe" element={<ProtectedShell><RecipeBuilderPage /></ProtectedShell>} />

      {/* Productions */}
      <Route path="/productions" element={<ProtectedShell><ProductionHistoryPage /></ProtectedShell>} />
      <Route path="/productions/new" element={<ProtectedShell><ProductionFormPage /></ProtectedShell>} />

      {/* Orders */}
      <Route path="/orders" element={<ProtectedShell><OrderListPage /></ProtectedShell>} />
      <Route path="/orders/new" element={<ProtectedShell><OrderFormPage /></ProtectedShell>} />
      <Route path="/orders/whatsapp" element={<ProtectedShell><WhatsAppOrderPage /></ProtectedShell>} />
      <Route path="/orders/:id" element={<ProtectedShell><OrderDetailPage /></ProtectedShell>} />

      {/* Stock movements */}
      <Route path="/stock-movements" element={<ProtectedShell><StockMovementHistoryPage /></ProtectedShell>} />

      {/* Settings */}
      <Route path="/settings/notifications" element={<ProtectedShell><NotificationSettingsPage /></ProtectedShell>} />

      {/* Export */}
      <Route path="/export" element={<ProtectedShell><DataExportPage /></ProtectedShell>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
