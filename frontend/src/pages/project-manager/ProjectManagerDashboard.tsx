import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KanbanBoard } from '@/components/projects/KanbanBoard';
import { ProjectDetails } from '@/components/projects/ProjectDetails';
import { getProjects } from '@/services/project.service';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCallback, useEffect, useState } from 'react';

type DashboardProject = {
  id: number;
  name: string;
  description?: string | null;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startDate: string | Date | null;
  endDate: string | Date | null;
  createdById?: number;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  [key: string]: any;
};

export function ProjectManagerDashboard() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<DashboardProject | null>(null);

  // Fetch projects
  const { data: projects = [], isLoading, error } = useQuery<DashboardProject[]>({
    queryKey: ['project-manager-projects'],
    queryFn: async () => {
      try {
        const data = await getProjects();
        return data.map(project => ({
          ...project,
          id: project.id,
          name: project.name || 'Unnamed Project',
          description: project.description ?? null,
          status: project.status || 'PLANNING',
          startDate: project.startDate || null,
          endDate: project.endDate || null
        }));
      } catch (err) {
        console.error('Error fetching projects:', err);
        throw err;
      }
    },
    retry: 1,
  });

  // Handle query errors
  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleProjectClick = useCallback((project: DashboardProject) => {
    setSelectedProject(project);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedProject(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">Project Manager Dashboard</CardTitle>
              <CardContent className="p-0 pt-4">
                {isLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <KanbanBoard 
                    projects={projects} 
                    onProjectClick={handleProjectClick} 
                  />
                )}
              </CardContent>
            </CardHeader>
          </Card>
        </div>
      </main>

      {/* Project Details Modal */}
      {selectedProject && (
        <ProjectDetails 
          project={selectedProject} 
          onClose={handleCloseDetails} 
        />
      )}
    </div>
  );
}
