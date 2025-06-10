import { Link, useNavigate, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge'; 
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'; 

export function MainNav() {
  const { user, logout } = useAuth();
  const [userRoles, setUserRoles] = useState({
    isAdmin: false,
    isProjectManager: false,
    isDeveloper: false,
    isTester: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.roles) {
      setUserRoles({
        isAdmin: user.roles.some((role: string | { name: string }) => 
          typeof role === 'string' ? role === 'admin' : role.name === 'admin'
        ),
        isProjectManager: user.roles.some((role: string | { name: string }) => 
          typeof role === 'string' ? role === 'project_manager' : role.name === 'project_manager'
        ),
        isDeveloper: user.roles.some((role: string | { name: string }) => 
          typeof role === 'string' ? role === 'developer' : role.name === 'developer'
        ),
        isTester: user.roles.some((role: string | { name: string }) => 
          typeof role === 'string' ? role === 'tester' : role.name === 'tester'
        )
      });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <span className="text-lg font-semibold cursor-default">
            Task Manager
          </span>
          <nav className="hidden md:flex items-center space-x-4">
            {(userRoles.isAdmin || userRoles.isProjectManager || userRoles.isDeveloper || userRoles.isTester) && (
              <NavLink
                to={userRoles.isTester ? "/tester" : (userRoles.isDeveloper ? "/developer" : "/dashboard")}
                className={({ isActive }) => 
                  `text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'} transition-colors`
                }
                onClick={(e) => {
                  // Prevent navigation if already on the target page
                  const targetPath = userRoles.isTester ? '/tester' : 
                                    (userRoles.isDeveloper ? '/developer' : '/dashboard');
                  if (window.location.pathname === targetPath) {
                    e.preventDefault();
                  }
                }}
              >
                Dashboard
              </NavLink>
            )}
            {userRoles.isAdmin && (
              <Link
                to="/admin"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin
              </Link>
            )}
            {userRoles.isProjectManager && (
              <Link
                to="/project-manager/projects"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Project Manager
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {(userRoles.isDeveloper || userRoles.isTester) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                    0
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-sm">
                  No new notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <span className="text-sm text-muted-foreground">
            {user.name} ({user.email})
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
