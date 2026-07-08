import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';
import CompaniesPage from './pages/admin/CompaniesPage';
import AuditPage from './pages/admin/AuditPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import WhatsAppPage from './pages/WhatsAppPage';
import AgentsPage from './pages/AgentsPage';
import AgentFormPage from './pages/AgentFormPage';
import FlowsPage from './pages/FlowsPage';
import FlowBuilderPage from './pages/FlowBuilderPage';
import ConversationsPage from './pages/ConversationsPage';
import CRMPage from './pages/CRMPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '10px', fontSize: '14px' },
          }}
        />
        <Routes>
          {/* rotas públicas */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* rotas protegidas — gestor + operador */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={['gestor', 'operador']}>
              <AppLayout><DashboardPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/conversations" element={
            <ProtectedRoute roles={['gestor', 'operador']}>
              <AppLayout noPadding><ConversationsPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/agents" element={
            <ProtectedRoute roles={['gestor']}>
              <AppLayout><AgentsPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/agents/new" element={
            <ProtectedRoute roles={['gestor']}>
              <AppLayout><AgentFormPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/agents/:id/edit" element={
            <ProtectedRoute roles={['gestor']}>
              <AppLayout><AgentFormPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/flows" element={
            <ProtectedRoute roles={['gestor']}>
              <AppLayout><FlowsPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/flows/:id" element={
            <ProtectedRoute roles={['gestor']}>
              <AppLayout noPadding><FlowBuilderPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/crm" element={
            <ProtectedRoute roles={['gestor', 'operador']}>
              <AppLayout noPadding><CRMPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings/whatsapp" element={
            <ProtectedRoute roles={['gestor']}>
              <AppLayout><WhatsAppPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute roles={['gestor']}>
              <AppLayout><SettingsPage /></AppLayout>
            </ProtectedRoute>
          } />

          {/* rotas admin */}
          <Route path="/admin/companies" element={
            <ProtectedRoute roles={['platform_admin']}>
              <AppLayout><CompaniesPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/companies/:companyId/users" element={
            <ProtectedRoute roles={['platform_admin']}>
              <AppLayout><UsersPage /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/metrics" element={
            <ProtectedRoute roles={['platform_admin']}>
              <AppLayout><PlaceholderPage title="Métricas Globais" description="Visão consolidada de toda a plataforma" /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/audit" element={
            <ProtectedRoute roles={['platform_admin']}>
              <AppLayout><AuditPage /></AppLayout>
            </ProtectedRoute>
          } />

          {/* fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
