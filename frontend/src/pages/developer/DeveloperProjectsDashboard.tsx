import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { KanbanBoard } from '@/components/projects/KanbanBoard';
import { ProjectDetails } from '@/components/projects/ProjectDetails';
import { useAuth } from '@/contexts/AuthContext';
import { getProjects, type ProjectStatus } from '@/services/project.service';
import { getTasks, type Task } from '@/services/task.service';

type DashboardProject = {
  id: number;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate: string | Date | null;
  endDate: string | Date | null;
  createdById?: number;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
};

export function DeveloperProjectsDashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [selectedProject, setSelectedProject] = useState<DashboardProject | null>(null);
  
  // Fetch projects for Kanban board
  const { 
    data: kanbanProjects = [], 
    isLoading: isLoadingProjects 
  } = useQuery<DashboardProject[]>({
    queryKey: ['developer-kanban-projects'],
    queryFn: async () => {
      const data = await getProjects();
      return data
        .map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate,
          createdById: project.createdById,
          creator: project.creator
        }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Sort projects by name in ascending order
    }
  });
  
  const handleProjectClick = useCallback((project: DashboardProject) => {
    setSelectedProject(project);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedProject(null);
  }, []);

  // Fetch tasks
  const { data: allTasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ['developer-tasks'],
    queryFn: () => getTasks(),
    enabled: showMyTasks,
  });

  // Filter tasks assigned to current user
  const myTasks = useMemo(() => {
    if (!user?.id) return [];
    return (allTasks as Task[]).filter((task: Task) => 
      task.assignedToId?.toString() === user.id.toString()
    );
  }, [allTasks, user?.id]);

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    return kanbanProjects.filter((project) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesName = project.name.toLowerCase().includes(searchLower);
      const matchesDescription = project.description?.toLowerCase().includes(searchLower) ?? false;
      return matchesName || matchesDescription;
    });
  }, [kanbanProjects, searchQuery]);

  // Show loading state
  if (isLoadingProjects || (showMyTasks && isLoadingTasks)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-muted-foreground">
            Viewing {filteredProjects.length} projects in Kanban view
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button 
            variant="outline"
            onClick={() => setShowMyTasks(!showMyTasks)}
            className="shrink-0"
          >
            {showMyTasks ? 'Back to Projects' : 'View My Tasks'}
          </Button>
        </div>
      </div>

      {showMyTasks ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">My Tasks</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myTasks.length > 0 ? (
              myTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        {task.status}
                      </span>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {task.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Priority: {task.priority}</span>
                      <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p>No tasks assigned to you yet.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <KanbanBoard 
            projects={filteredProjects} 
            onProjectClick={handleProjectClick} 
          />
          
          {filteredProjects.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="text-lg">No projects found</p>
              <p className="text-sm">
                {searchQuery ? 'Try a different search term' : 'There are no projects to display'}
              </p>
            </div>
          )}
        </div>
      )}

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
