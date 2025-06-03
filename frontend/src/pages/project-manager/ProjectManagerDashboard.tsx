import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KanbanBoard } from '@/components/projects/KanbanBoard';
import { ProjectDetails } from '@/components/projects/ProjectDetails';
import { getProjects, type ProjectStatus } from '@/services/project.service';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const statusFilters = [
  { key: 'all', label: 'All Projects' },
  { key: 'PLANNING', label: 'Planned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
];

export function ProjectManagerDashboard() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<DashboardProject | null>(null);
  const [activeFilter, setActiveFilter] = useState<ProjectStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter projects based on active filter and search query
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesFilter = activeFilter === 'all' || project.status === activeFilter;
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesFilter && (searchQuery === '' || matchesSearch);
    });
  }, [projects, activeFilter, searchQuery]);

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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="text-2xl font-semibold">Project Manager Dashboard</CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search projects..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <Select
                  value={activeFilter}
                  onValueChange={(value: string) => setActiveFilter(value as ProjectStatus | 'all')}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map(filter => (
                      <SelectItem key={filter.key} value={filter.key}>
                        {filter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <CardContent className="p-0 pt-4">
                {isLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <KanbanBoard 
                    projects={filteredProjects} 
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
