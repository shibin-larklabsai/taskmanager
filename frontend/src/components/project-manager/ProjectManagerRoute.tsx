import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProjectManagerRouteProps {
  children?: React.ReactNode;
}

export function ProjectManagerRoute({ children }: ProjectManagerRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Log authentication state for debugging
  useEffect(() => {
    console.log('Auth state:', { isAuthenticated, loading, user, path: location.pathname });
    
    // Add a small delay to ensure we have the latest auth state
    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, user, location.pathname]);

  if (loading || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If not authenticated, redirect to login with return URL
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Helper function to check if user has required role
  const hasRequiredRole = () => {
    if (!user?.roles) return false;
    
    return user.roles.some((role: string | { name: string }) => {
      // Handle case where role is an object with a 'name' property
      if (typeof role === 'object' && role !== null) {
        return ['project_manager', 'admin', 'superadmin'].includes(role.name?.toLowerCase());
      }
      // Handle case where role is a string
      if (typeof role === 'string') {
        return ['project_manager', 'admin', 'superadmin'].includes(role.toLowerCase());
      }
      return false;
    });
  };

  const hasAccess = hasRequiredRole();
  console.log('Role check:', { hasAccess, roles: user?.roles });

  // If user doesn't have required role, redirect to dashboard
  if (!hasAccess) {
    console.log('Access denied, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export default ProjectManagerRoute;
