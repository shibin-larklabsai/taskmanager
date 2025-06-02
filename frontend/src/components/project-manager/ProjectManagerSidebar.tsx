import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, FolderKanban } from 'lucide-react';

const navigation = [
  { name: 'Projects', href: '/project-manager/projects', icon: FolderKanban },
  { name: 'Team', href: '/project-manager/team', icon: Users }
];

export function ProjectManagerSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white shadow flex-shrink-0">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Project Manager</h2>
      </div>
      <nav className="p-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
                         (item.href !== '/project-manager' && 
                          location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                'group flex items-center px-2 py-1.5 text-sm font-medium rounded-md'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon
                className={cn(
                  isActive ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-700',
                  'flex-shrink-0 mr-3 h-5 w-5'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
