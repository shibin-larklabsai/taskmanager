import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminPage } from '@/pages/AdminPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { ProjectsPage } from '@/pages/admin/ProjectsPage';
import MainLayout from '@/components/layout/MainLayout';
import ConnectionTest from './components/ConnectionTest';
import { projectManagerRoutes } from '@/routes/projectManagerRoutes';
import { ProjectManagerRoute } from '@/components/project-manager/ProjectManagerRoute';

// Layout wrapper
const LayoutWrapper = ({ children }: { children: React.ReactNode }) => (
  <MainLayout>
    {children}
    <Toaster />
  </MainLayout>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }

  // If not authenticated, the ProtectedRoute will handle redirection
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Debug log to check user data and roles
  console.log('User data:', user);
  console.log('User roles:', user?.roles);

  // Check if user has admin role (handling both string array and object array)
  const hasAdminRole = user?.roles?.some((role: string | { name: string }) => {
    // Handle case where role is an object with a 'name' property
    if (typeof role === 'object' && role !== null) {
      return role.name === 'admin';
    }
    // Handle case where role is a string
    return role === 'admin';
  });

  console.log('Has admin role:', hasAdminRole);

  // If user doesn't have admin role, redirect to dashboard
  if (!hasAdminRole) {
    console.log('User is not an admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main App Layout
function AppLayout() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <LayoutWrapper>
              <Outlet />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="test-connection" element={<ConnectionTest />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <LayoutWrapper>
                <Outlet />
              </LayoutWrapper>
            </AdminRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="projects" element={<ProjectsPage />} />
      </Route>

      {/* Project Manager Routes */}
      <Route
        path="/project-manager"
        element={
          <ProtectedRoute>
            <ProjectManagerRoute>
              <LayoutWrapper>
                <Outlet />
              </LayoutWrapper>
            </ProjectManagerRoute>
          </ProtectedRoute>
        }
      >
        {projectManagerRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={route.element}>
            {route.children?.map((childRoute) => (
              <Route
                key={childRoute.path || 'index'}
                index={childRoute.index}
                path={childRoute.path}
                element={childRoute.element}
              />
            ))}
          </Route>
        ))}
      </Route>
      
      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

// App Entry Point
function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppLayout />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
