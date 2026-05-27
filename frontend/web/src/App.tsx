import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import esES from 'antd/locale/es_ES';
import { useBusinessStore } from './store/businessStore';
import AppLayout from './components/AppLayout';
import UnverifiedGuard from './components/UnverifiedGuard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PricesPage from './pages/PricesPage';
import ProductsUploadPage from './pages/ProductsUploadPage';
import PromotionsPage from './pages/PromotionsPage';
import BusinessProfilePage from './pages/BusinessProfilePage';
import AdminApprovalPage from './pages/AdminApprovalPage';
import LandingPage from './pages/LandingPage';
import MerchantOnboardingPage from './pages/MerchantOnboardingPage';
import DocsPage from './pages/DocsPage';
import ConsumerLayout from './pages/consumer/ConsumerLayout';
import ListsPage from './pages/consumer/ListsPage';
import ListDetailPage from './pages/consumer/ListDetailPage';
import TemplatesPage from './pages/consumer/TemplatesPage';
import RoutePage from './pages/consumer/RoutePage';
import ProductsCatalogPage from './pages/consumer/ProductsCatalogPage';
import PriceComparePage from './pages/consumer/PriceComparePage';
import ProductProposalPage from './pages/consumer/ProductProposalPage';
import MapPage from './pages/consumer/MapPage';
import StoreProfilePage from './pages/consumer/StoreProfilePage';
import FavoritesPage from './pages/consumer/FavoritesPage';
import AssistantPage from './pages/consumer/AssistantPage';
import OCRPage from './pages/consumer/OCRPage';
import ProfilePage from './pages/consumer/ProfilePage';
import EditProfilePage from './pages/consumer/EditProfilePage';
import ChangePasswordPage from './pages/consumer/ChangePasswordPage';
import OptimizerConfigPage from './pages/consumer/OptimizerConfigPage';
import NotificationsPage from './pages/consumer/NotificationsPage';
import PriceAlertsPage from './pages/consumer/PriceAlertsPage';

/** Auth guard: redirect to /login if no token in localStorage */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const { setToken } = useBusinessStore();

  // Restore token from localStorage on app init
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, [setToken]);

  return (
    <ConfigProvider
      locale={esES}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#5f5e5e',
          colorInfo: '#5f5e5e',
          colorSuccess: '#5a7d66',
          colorWarning: '#8f6d43',
          colorError: '#a64542',
          colorBgBase: '#fffcf7',
          colorBgLayout: '#f6f4ec',
          colorTextBase: '#383831',
          borderRadius: 14,
          borderRadiusLG: 18,
          borderRadiusSM: 10,
          boxShadow: '0 12px 32px -4px rgba(56, 56, 49, 0.08)',
          boxShadowSecondary: '0 8px 24px -6px rgba(56, 56, 49, 0.06)',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontFamilyCode: "'JetBrains Mono', monospace",
        },
        components: {
          Layout: {
            bodyBg: '#f6f4ec',
            siderBg: '#383831',
            triggerBg: '#4b4b44',
          },
          Card: {
            borderRadiusLG: 18,
            boxShadowTertiary: '0 12px 32px -4px rgba(56, 56, 49, 0.08)',
          },
          Button: {
            borderRadius: 12,
            controlHeight: 42,
            controlHeightLG: 48,
          },
          Input: {
            borderRadius: 12,
            activeBg: '#ffffff',
            hoverBg: '#ffffff',
          },
          Table: {
            headerBg: '#fcf9f3',
            headerColor: '#383831',
            rowHoverBg: '#f6f2ea',
            borderColor: '#ece7df',
          },
          Menu: {
            darkItemBg: '#383831',
            darkItemSelectedBg: '#5f5e5e',
            darkItemHoverBg: '#4b4b44',
          },
        },
      }}
    >
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<MerchantOnboardingPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes wrapped in auth + unverified guard + layout */}
          <Route
            element={
              <RequireAuth>
                <UnverifiedGuard>
                  <AppLayout />
                </UnverifiedGuard>
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/prices" element={<PricesPage />} />
            <Route path="/products-upload" element={<ProductsUploadPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/profile" element={<BusinessProfilePage />} />
          </Route>

          {/* Admin routes: auth required, no business-profile guard */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/admin" element={<AdminApprovalPage />} />
          </Route>

          {/* Consumer routes — /app/* — auth required, no business-profile guard */}
          <Route
            element={
              <RequireAuth>
                <ConsumerLayout />
              </RequireAuth>
            }
          >
            <Route path="/app" element={<Navigate to="/app/lists" replace />} />
            <Route path="/app/lists" element={<ListsPage />} />
            <Route path="/app/lists/:listId" element={<ListDetailPage />} />
            <Route path="/app/lists/:listId/route" element={<RoutePage />} />
            <Route path="/app/templates" element={<TemplatesPage />} />
            <Route path="/app/catalog" element={<ProductsCatalogPage />} />
            <Route path="/app/catalog/compare/:productId" element={<PriceComparePage />} />
            <Route path="/app/catalog/propose" element={<ProductProposalPage />} />
            <Route path="/app/map" element={<MapPage />} />
            <Route path="/app/map/store/:storeId" element={<StoreProfilePage />} />
            <Route path="/app/favorites" element={<FavoritesPage />} />
            <Route path="/app/assistant" element={<AssistantPage />} />
            <Route path="/app/ocr" element={<OCRPage />} />
            <Route path="/app/profile" element={<ProfilePage />} />
            <Route path="/app/profile/edit" element={<EditProfilePage />} />
            <Route path="/app/profile/password" element={<ChangePasswordPage />} />
            <Route path="/app/profile/optimizer" element={<OptimizerConfigPage />} />
            <Route path="/app/notifications" element={<NotificationsPage />} />
            <Route path="/app/alerts" element={<PriceAlertsPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
