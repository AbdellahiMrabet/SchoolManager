// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Common/Toast';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { ClassesPage } from './pages/ClassesPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { GradesPage } from './pages/GradesPage';
import { ExamsPage } from './pages/ExamsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeachersPage } from './pages/TeachersPage';
import { RegistrationFeesPage } from './pages/RegistrationFeesPage';
import { CashAccountPage } from './pages/CashAccountPage';
import { TeacherPaymentsPage } from './pages/TeacherPaymentsPage';
import { SchoolFeesPage } from './pages/SchoolFeesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { Sidebar } from './components/Layout/Sidebar';
import './App.css';
import { CoefficientsPage } from './pages/CoefficientsPage';
import { BulletinPage } from './pages/BulletinPage';
import { PromotionPage } from './pages/PromotionPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AccountingPage } from './pages/AccountingPage';

const App: React.FC = () => {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
};

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get current path without the leading slash
  const currentPath = location.pathname.replace('/', '') || 'dashboard';

  const handleNavChange = (key: string) => {
    navigate(`/${key}`);
  };

  return (
    <div className="app-layout">
      <Sidebar 
        user={user} 
        onLogout={logout} 
        activeNav={currentPath}
        onNavChange={handleNavChange}
      />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/coefficients" element={<CoefficientsPage />} />
          <Route path="/grades" element={<GradesPage />} />
          <Route path="/bulletin" element={<BulletinPage />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/registration-fees" element={<RegistrationFeesPage />} />
          <Route path="/cash-account" element={<CashAccountPage />} />
          <Route path="/teacher-payments" element={<TeacherPaymentsPage />} />
          <Route path="/school-fees" element={<SchoolFeesPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/accounting" element={<AccountingPage />} />
          <Route path="/promotion" element={<PromotionPage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;