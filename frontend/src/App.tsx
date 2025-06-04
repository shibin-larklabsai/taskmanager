import { Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminPage } from '@/pages/AdminPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { ProjectsPage } from '@/pages/admin/ProjectsPage';
import { AdminLayout } from '@/components/admin/AdminLayout';
import MainLayout from '@/components/layout/MainLayout';
import ConnectionTest from './components/ConnectionTest';
import { ProjectManagerLayout } from '@/components/project-manager/ProjectManagerLayout';
import { ProjectManagerDashboard } from '@/pages/project-manager/ProjectManagerDashboard';
import { ProjectManagerTasks } from '@/pages/project-manager/ProjectManagerTasks';
import { TeamAssignment } from '@/pages/project-manager/TeamAssignment';
import TasksPage from '@/pages/project-manager/TasksPage';
import { TaskDetailPage } from '@/pages/project-manager/TaskDetailPage';
import { CreateTaskPage } from '@/pages/project-manager/CreateTaskPage';
import { EditTaskPage } from '@/pages/project-manager/EditTaskPage';
import { developerRoutes } from '@/routes/developerRoutes';
import { testerRoutes } from '@/routes/testerRoutes';
import { userRoutes } from '@/routes/userRoutes';


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

// Role-based redirect component
const RoleBasedRedirect = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const isAdmin = user.roles?.some(role =>
        (typeof role === 'string' && role === 'admin') ||
        (typeof role === 'object' && role.name === 'admin')
      );
      
      const isProjectManager = user.roles?.some(role => 
        (typeof role === 'string' && role === 'project_manager') || 
        (typeof role === 'object' && role.name === 'project_manager')
      );
      
      const isDeveloper = user.roles?.some(role =>
        (typeof role === 'string' && role === 'developer') ||
        (typeof role === 'object' && role.name === 'developer')
      );

      const isTester = user.roles?.some(role =>
        (typeof role === 'string' && role === 'tester') ||
        (typeof role === 'object' && role.name === 'tester')
      );

      const isUser = user.roles?.some(role =>
        (typeof role === 'string' && role === 'user') ||
        (typeof role === 'object' && role.name === 'user')
      );

      if (isAdmin) {
        window.location.href = '/dashboard';
      } else if (isProjectManager) {
        window.location.href = '/project-manager';
      } else if (isDeveloper) {
        window.location.href = '/developer';
      } else if (isTester) {
        window.location.href = '/tester';
      } else if (isUser) {
        window.location.href = '/user';
      } else {
        // Default redirect if no specific role matches
        window.location.href = '/';
      }
    }
  }, [user]);

  // Show a loading state or null while redirecting
  return null;
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
        <Route 
          index 
          element={
            <RoleBasedRedirect />
          } 
        />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="test-connection" element={<ConnectionTest />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminLayout />
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
            <LayoutWrapper>
              <ProjectManagerLayout />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      >
        <Route index element={<ProjectManagerDashboard />} />
        <Route path="projects" element={<ProjectManagerTasks />} />
        <Route path="team" element={<TeamAssignment />} />
        <Route path="tasks">
          <Route index element={<TasksPage />} />
          <Route path="new" element={<CreateTaskPage />} />
          <Route path=":taskId" element={<TaskDetailPage />} />
          <Route path=":taskId/edit" element={<EditTaskPage />} />
        </Route>
      </Route>

      {/* Developer Routes */}
      <Route path="/developer">
        <Route
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Outlet />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        >
          {developerRoutes.map((route) => (
            <Route
              key={route.path || 'index'}
              path={route.path}
              element={route.element}
            >
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
      </Route>

      {/* Tester Routes */}
      <Route path="/tester">
        <Route
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Outlet />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        >
          {testerRoutes.map((route) => (
            <Route
              key={route.path || 'index'}
              path={route.path}
              element={route.element}
            >
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
      </Route>

      {/* User Routes */}
      <Route path="/user">
        <Route
          element={
            <ProtectedRoute>
              <LayoutWrapper>
                <Outlet />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        >
          {userRoutes.map((route) => (
            <Route
              key={route.path || 'index'}
              path={route.path}
              element={route.element}
            >
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
