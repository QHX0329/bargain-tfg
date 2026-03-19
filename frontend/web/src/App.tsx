import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { useBusinessStore } from './store/businessStore';
import AppLayout from './components/AppLayout';
import UnverifiedGuard from './components/UnverifiedGuard';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PricesPage from './pages/PricesPage';
import ProductsUploadPage from './pages/ProductsUploadPage';
import PromotionsPage from './pages/PromotionsPage';
import BusinessProfilePage from './pages/BusinessProfilePage';

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
    <ConfigProvider locale={esES}>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

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
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/prices" element={<PricesPage />} />
            <Route path="/products-upload" element={<ProductsUploadPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/profile" element={<BusinessProfilePage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
