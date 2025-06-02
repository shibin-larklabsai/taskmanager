import { useAuth } from '@/contexts/AuthContext';

export function useProjectManagerRole() {
  const { user } = useAuth();

  const isProjectManager = user?.roles?.some((role: string | { name: string }) => {
    const roleName = typeof role === 'object' ? role.name : role;
    return roleName === 'project_manager' || roleName === 'admin';
  });

  return { isProjectManager };
}
