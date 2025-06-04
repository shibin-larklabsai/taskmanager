import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getProjects, type Project } from '@/services/project.service';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function TesterProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch all projects
  const { 
    data: projects = [], 
    isLoading, 
    error 
  } = useQuery<Project[]>({
    queryKey: ['tester-projects'],
    queryFn: async () => {
      const data = await getProjects();
      return data;
    },
    enabled: !!user,
  });

  // Filter projects to only show IN_PROGRESS ones
  const inProgressProjects = (projects || []).filter(
    (project: Project) => project.status === 'IN_PROGRESS'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Error loading projects. Please try again later.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Projects in Testing</h1>
        <p className="text-muted-foreground">
          View and manage projects that are currently in progress and ready for testing.
        </p>
      </div>

      {inProgressProjects.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No projects are currently in progress.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {inProgressProjects.map((project: Project) => (
            <Card 
              key={project.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/tester/projects/${project.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    project.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                    project.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 line-clamp-2 mb-4">
                  {project.description || 'No description available'}
                </p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Start: {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</span>
                  <span>End: {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default TesterProjectsPage;
