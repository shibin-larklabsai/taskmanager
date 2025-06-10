import { Outlet, useLocation } from 'react-router-dom';
import { ProjectManagerSidebar } from './ProjectManagerSidebar';

export function ProjectManagerLayout() {
  const location = useLocation();
  const showSidebar = location.pathname.includes('/project-manager/projects') || 
                    location.pathname.includes('/project-manager/team');

  return (
    <div className="flex h-screen">
      {/* Sidebar - only show on Projects and Team pages */}
      {showSidebar && <ProjectManagerSidebar />}
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}

export default ProjectManagerLayout;
