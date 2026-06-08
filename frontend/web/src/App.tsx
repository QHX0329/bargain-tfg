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

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
