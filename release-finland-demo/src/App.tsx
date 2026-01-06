import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import FinancierLayout from './layouts/FinancierLayout';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyPage from './pages/VerifyPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';

// Customer pages
import CustomerDashboard from './pages/customer/Dashboard';
import CustomerApplications from './pages/customer/Applications';
import CustomerApplicationDetail from './pages/customer/ApplicationDetail';

// Financier pages
import FinancierDashboard from './pages/financier/Dashboard';
import FinancierApplications from './pages/financier/Applications';
import FinancierApplicationDetail from './pages/financier/ApplicationDetail';

// Components
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import { DemoPanel } from './components/DemoPanel';

// Release Finland Demo - NO Admin, NO Password Protection
function App() {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#047857',
            color: '#fff',
            borderRadius: '12px',
          },
        }}
      />
      
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
        </Route>

        {/* Legal pages (standalone) */}
        <Route path="/tietosuoja" element={<PrivacyPolicy />} />
        <Route path="/kayttoehdot" element={<Terms />} />

        {/* Customer routes */}
        <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<CustomerDashboard />} />
            <Route path="/dashboard/applications" element={<CustomerApplications />} />
            <Route path="/dashboard/applications/:id" element={<CustomerApplicationDetail />} />
          </Route>
        </Route>

        {/* Financier routes - Release Finland Oy */}
        <Route element={<ProtectedRoute allowedRoles={['FINANCIER']} />}>
          <Route element={<FinancierLayout />}>
            <Route path="/financier" element={<FinancierDashboard />} />
            <Route path="/financier/applications" element={<FinancierApplications />} />
            <Route path="/financier/applications/:id" element={<FinancierApplicationDetail />} />
          </Route>
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Demo panel - ALWAYS visible for Release Finland demo */}
      <DemoPanel />
    </>
  );
}

export default App;
