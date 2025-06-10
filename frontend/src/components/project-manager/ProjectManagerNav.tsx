import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ListChecks, Users, Settings, FolderKanban } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/project-manager', icon: LayoutDashboard },
  { name: 'Projects', href: '/project-manager/projects', icon: FolderKanban },
  { name: 'Tasks', href: '/project-manager/tasks', icon: ListChecks },
  { name: 'Team', href: '/project-manager/team', icon: Users },
  { name: 'Settings', href: '/project-manager/settings', icon: Settings },
];

export function ProjectManagerNav() {
  const location = useLocation();

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              'group flex items-center px-3 py-2 text-sm font-medium rounded-md'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon
              className={cn(
                isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500',
                'flex-shrink-0 -ml-1 mr-3 h-6 w-6'
              )}
              aria-hidden="true"
            />
            <span className="truncate">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default ProjectManagerNav;
