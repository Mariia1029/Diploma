import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import RestorationModal from './components/auth/RestorationModal';

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <AuthPage />;
  if (user.isDeleted) return <RestorationModal />;
  if (user.role === 'Admin') return <AdminPage />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

