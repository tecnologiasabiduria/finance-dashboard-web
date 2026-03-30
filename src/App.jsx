import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import CreatePassword from './pages/CreatePassword';
import SubscriptionRequired from './pages/SubscriptionRequired';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import TransactionForm from './pages/TransactionForm';
import Settings from './pages/Settings';
import Goals from './pages/Goals';
import Categories from './pages/Categories';
import AnnualReport from './pages/AnnualReport';
import Reports from './pages/Reports';
import ImportTransactions from './pages/ImportTransactions';
import Cartera from './pages/Cartera';

function App() {
  return (
    <SettingsProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/subscription-required" element={<SubscriptionRequired />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/create-password" element={<CreatePassword />} />

          {/* Protected Routes with Dashboard Layout */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/new" element={<TransactionForm />} />
            <Route path="/transactions/import" element={<ImportTransactions />} />
            <Route path="/transactions/:id" element={<TransactionForm />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/cartera" element={<Cartera />} />
            {/* Redirects for old routes */}
            <Route path="/dashboard" element={<Navigate to="/reports" replace />} />
            <Route path="/annual-report" element={<Navigate to="/reports" replace />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/reports" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
