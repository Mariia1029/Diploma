import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import RestorationModal from './components/auth/RestorationModal';

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  const defaultRedirect = !user
    ? '/auth'
    : user.role === 'Admin'
      ? '/admin'
      : '/dashboard';

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to={defaultRedirect} replace /> : <AuthPage />}
      />
      <Route
        path="/dashboard/*"
        element={
          !user ? <Navigate to="/auth" replace /> :
          user.isDeleted ? <RestorationModal /> :
          user.role === 'Admin' ? <Navigate to="/admin" replace /> :
          <DashboardPage />
        }
      />
      <Route
        path="/admin/*"
        element={
          !user ? <Navigate to="/auth" replace /> :
          user.isDeleted ? <RestorationModal /> :
          user.role !== 'Admin' ? <Navigate to="/dashboard" replace /> :
          <AdminPage />
        }
      />
      <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
