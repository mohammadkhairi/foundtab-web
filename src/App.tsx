import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
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

export default function App() {
  const onboardingDone = isOnboardingDone()

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={<Navigate to={onboardingDone ? '/dashboard' : '/onboarding'} replace />}
      />

      {/* Onboarding — no bottom nav */}
      <Route path="/onboarding" element={<OnboardingFlow />} />

      {/* Main app — with bottom nav */}
      <Route
        path="/dashboard"
        element={<AppShell><DashboardPage /></AppShell>}
      />

      {/* Raw materials */}
      <Route
        path="/raw-materials"
        element={<AppShell><RawMaterialListPage /></AppShell>}
      />
      <Route
        path="/raw-materials/new"
        element={<AppShell><RawMaterialFormPage /></AppShell>}
      />
      <Route
        path="/raw-materials/:id/edit"
        element={<AppShell><RawMaterialFormPage /></AppShell>}
      />

      {/* Purchases */}
      <Route
        path="/purchases"
        element={<AppShell><PurchaseListPage /></AppShell>}
      />
      <Route
        path="/purchases/scan"
        element={<AppShell><OcrReviewPage /></AppShell>}
      />
      <Route
        path="/purchases/new"
        element={<AppShell><PurchaseFormPage /></AppShell>}
      />

      {/* Products */}
      <Route
        path="/products"
        element={<AppShell><ProductListPage /></AppShell>}
      />
      <Route
        path="/products/new"
        element={<AppShell><ProductFormPage /></AppShell>}
      />
      <Route
        path="/products/:id/edit"
        element={<AppShell><ProductFormPage /></AppShell>}
      />
      <Route
        path="/products/:id/recipe"
        element={<AppShell><RecipeBuilderPage /></AppShell>}
      />

      {/* Productions */}
      <Route
        path="/productions"
        element={<AppShell><ProductionHistoryPage /></AppShell>}
      />
      <Route
        path="/productions/new"
        element={<AppShell><ProductionFormPage /></AppShell>}
      />

      {/* Orders */}
      <Route
        path="/orders"
        element={<AppShell><OrderListPage /></AppShell>}
      />
      <Route
        path="/orders/new"
        element={<AppShell><OrderFormPage /></AppShell>}
      />
      <Route
        path="/orders/whatsapp"
        element={<AppShell><WhatsAppOrderPage /></AppShell>}
      />
      <Route
        path="/orders/:id"
        element={<AppShell><OrderDetailPage /></AppShell>}
      />

      {/* Stock movements */}
      <Route
        path="/stock-movements"
        element={<AppShell><StockMovementHistoryPage /></AppShell>}
      />

      {/* Settings */}
      <Route
        path="/settings/notifications"
        element={<AppShell><NotificationSettingsPage /></AppShell>}
      />

      {/* Export */}
      <Route
        path="/export"
        element={<AppShell><DataExportPage /></AppShell>}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
