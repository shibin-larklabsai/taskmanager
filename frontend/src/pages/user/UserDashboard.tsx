import { FC, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KanbanBoard, type KanbanProject } from '@/components/projects/KanbanBoard';
import { getProjects } from '@/services/project.service';
import { Project } from '@/services/project.service';
import { ProjectDetails } from '@/components/projects/ProjectDetails';
// Loading state will use simple text instead of Skeleton

const UserDashboard: FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['user-projects'],
    queryFn: () => getProjects(false), // Don't include all projects, just user's projects
  });

  const handleProjectClick = (project: Project | KanbanProject) => {
    // Convert KanbanProject to Project if needed
    const projectWithDetails = project as Project;
    setSelectedProject(projectWithDetails);
  };

  const handleCloseDetails = () => {
    setSelectedProject(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-4">
            <h1 className="text-2xl font-bold">Loading projects...</h1>
            <p className="text-muted-foreground">
              Please wait while we load your projects.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-2xl font-bold">Error Loading Projects</h1>
            <p className="mt-2 text-destructive">
              Failed to load projects. Please try again later.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="mt-2 text-muted-foreground">
            View and manage your projects in the Kanban board below.
          </p>
          
          <div className="mt-8">
            {projects.length > 0 ? (
              <KanbanBoard 
                projects={projects} 
                onProjectClick={handleProjectClick} 
              />
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  You don't have any projects assigned yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedProject && (
        <ProjectDetails
          project={selectedProject}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
};

export default UserDashboard;
