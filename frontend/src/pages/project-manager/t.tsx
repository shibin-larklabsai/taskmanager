import { useQuery } from '@tanstack/react-query';
import { Loader2, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { KanbanBoard } from '@/components/projects/KanbanBoard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProjects, type Project, type ProjectStatus } from '@/services/project.service';
import { useState, useMemo, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserInfo {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

export function ProjectManagerDashboard() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [creator, setCreator] = useState<UserInfo | null>(null);
  const [isLoadingCreator] = useState(false);

  // Set creator details when a project is selected
  useEffect(() => {
    if (!selectedProject?.createdById) {
      setCreator(null);
      return;
    }
    
    // Since we're using mock data, we can create the user object directly
    const user: UserInfo = {
      id: selectedProject.createdById,
      name: 'John Doe',
      email: 'john.doe@example.com',
    };
    setCreator(user);
  }, [selectedProject?.createdById]);

  // Fetch projects (excluding cancelled ones)
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects,
    error: projectsError
  } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const allProjects = await getProjects();
      return allProjects.filter(project => project.status !== 'CANCELLED');
    },
  });

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
  };

  // Transform projects to ensure type safety
  const kanbanProjects = useMemo(() => {
    return projects.map(project => ({
      ...project,
      status: project.status as ProjectStatus,
      startDate: project.startDate ?? null,
      endDate: project.endDate ?? null
    }));
  }, [projects]);

  if (isLoadingProjects) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Project Manager Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground">Total Projects</h3>
              <p className="text-2xl font-bold">{projects.length}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground">In Progress</h3>
              <p className="text-2xl font-bold">
                {projects.filter(p => p.status === 'IN_PROGRESS').length}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
              <p className="text-2xl font-bold">
                {projects.filter(p => p.status === 'COMPLETED').length}
              </p>
            </div>
          </Card>
        </div>

        {/* Kanban Board */}
        <div className="mt-8">
          <h2 className="mb-6 text-2xl font-semibold">Projects</h2>
          {projectsError ? (
            <div className="p-8 text-center bg-red-50 text-red-600 rounded-lg">
              Failed to load projects. Please try again.
            </div>
          ) : (
            <KanbanBoard 
              projects={kanbanProjects} 
              onProjectClick={handleProjectClick} 
            />
          )}
        </div>
      </div>

      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open: boolean) => !open && setSelectedProject(null)}>
        <DialogContent>
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProject.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <p className="capitalize">{selectedProject.status.toLowerCase().replace('_', ' ')}</p>
                </div>
                {selectedProject.description && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm">
                        {selectedProject.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                )}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Start Date</h3>
                      <p>{selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">End Date</h3>
                      <p>{selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Created By</h3>
                    {isLoadingCreator ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading creator information...</span>
                      </div>
                    ) : creator ? (
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          {creator.avatar ? (
                            <AvatarImage src={creator.avatar} alt={creator.name} />
                          ) : (
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">{creator.name}</p>
                          <p className="text-sm text-muted-foreground">{creator.email}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Creator information not available</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
