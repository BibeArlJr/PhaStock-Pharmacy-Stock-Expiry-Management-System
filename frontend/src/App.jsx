import { Navigate, Route, Routes } from 'react-router-dom';

import AppShell from '@/components/AppShell';
import ProtectedRoute from '@/components/ProtectedRoute';
import AlertsPage from '@/pages/AlertsPage';
import BatchStockPage from '@/pages/BatchStockPage';
import DashboardPage from '@/pages/DashboardPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import LoginPage from '@/pages/LoginPage';
import MedicinesPage from '@/pages/MedicinesPage';
import ReceiptDetailPage from '@/pages/ReceiptDetailPage';
import ReceiptNewPage from '@/pages/ReceiptNewPage';
import ReceiptsPage from '@/pages/ReceiptsPage';
import ReceiptSearchPage from '@/pages/ReceiptSearchPage';
import SettingsPage from '@/pages/SettingsPage';
import SignupPage from '@/pages/SignupPage';
import StockIssueNewPage from '@/pages/StockIssueNewPage';
import StockIssuePage from '@/pages/StockIssuePage';
import SuppliersPage from '@/pages/SuppliersPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/medicines" element={<MedicinesPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="/receipts/new" element={<ReceiptNewPage />} />
        <Route path="/receipts/:id" element={<ReceiptDetailPage />} />
        <Route path="/batch-stock" element={<BatchStockPage />} />
        <Route path="/stock-issue" element={<StockIssuePage />} />
        <Route path="/stock-issue/new" element={<StockIssueNewPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/receipt-search" element={<ReceiptSearchPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="/purchase-receipts/new" element={<Navigate to="/receipts/new" replace />} />
        <Route path="/purchase-receipts/:id" element={<Navigate to="/receipts" replace />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
