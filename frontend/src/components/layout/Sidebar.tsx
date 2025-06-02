import { Link, useLocation } from 'react-router-dom';
import { useRole } from '@/contexts/RoleContext';
import { LayoutDashboard, Users, Settings, FolderKanban, Code2, FileText, BarChart2, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavigationItem } from '@/types/navigation';

const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'VIEWER'],
  },
  {
    title: 'Projects',
    href: '/projects',
    icon: <FolderKanban className="h-5 w-5" />,
    roles: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER', 'VIEWER'],
  },
  {
    title: 'Tasks',
    href: '/tasks',
    icon: <FileText className="h-5 w-5" />,
    roles: ['ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'],
  },
  {
    title: 'Team',
    href: '/team',
    icon: <Users className="h-5 w-5" />,
    roles: ['ADMIN', 'PROJECT_MANAGER'],
  },
  {
    title: 'API Keys',
    href: '/api-keys',
    icon: <Code2 className="h-5 w-5" />,
    roles: ['ADMIN', 'DEVELOPER'],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: <BarChart2 className="h-5 w-5" />,
    roles: ['ADMIN', 'PROJECT_MANAGER'],
  },
  {
    title: 'Project Manager',
    href: '/project-manager',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['ADMIN', 'PROJECT_MANAGER'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
    roles: ['ADMIN'],
  },
];

export function Sidebar() {
  const { hasAnyRole } = useRole();
  const location = useLocation();

  const filteredNavItems = navigationItems.filter(item => hasAnyRole(item.roles));

  return (
    <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40 w-[250px]">
      <div className="flex flex-col gap-2 p-4">
        <div className="flex h-[60px] items-center px-6">
          <Link className="flex items-center gap-2 font-semibold" to="/">
            <span>TaskFlow</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-900 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
                  location.pathname === item.href
                    ? 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-50'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
