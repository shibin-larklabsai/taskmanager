import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getProjects, 
  deleteProject, 
  type Project, 
  type ProjectStatus
} from '@/services/project.service';
import { ProjectForm } from '@/components/projects/ProjectForm';

const statusOptions: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PLANNING', label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface ProcessedProject extends Project {
  isExpanded?: boolean;
  isLoadingTasks?: boolean;
  tasks?: any[];
}

export function ProjectManagerTasks() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    name: '',
    status: 'all' as ProjectStatus | 'all',
  });

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['project-manager-projects'],
    queryFn: async () => {
      try {
        return await getProjects();
      } catch (error) {
        toast.error('Failed to fetch projects');
        console.error('Error fetching projects:', error);
        throw error;
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-manager-projects'] });
      toast.success('Project deleted successfully');
      setProjectToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete project');
      console.error('Error deleting project:', error);
    },
  });

  const formatDate = (date: string | Date | null): string => {
    if (!date) return 'Not set';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return format(dateObj, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    type StatusMap = {
      [key in ProjectStatus]: { label: string; variant: string };
    };
    
    const statusMap: StatusMap = {
      PLANNING: { label: 'Planned', variant: 'bg-blue-100 text-blue-800' },
      IN_PROGRESS: { label: 'In Progress', variant: 'bg-yellow-100 text-yellow-800' },
      COMPLETED: { label: 'Completed', variant: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Cancelled', variant: 'bg-red-100 text-red-800' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.variant}`}>{statusInfo.label}</span>;
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesName = project.name.toLowerCase().includes(filters.name.toLowerCase());
      const matchesStatus = filters.status === 'all' || project.status === filters.status;
      return matchesName && matchesStatus;
    });
  }, [projects, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      name: '',
      status: 'all'
    });
  };

  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      deleteMutation.mutate(projectToDelete.id);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsFormOpen(true);
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="p-4 sm:p-6 flex flex-col h-full w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold">Project Management</h1>
          <Button onClick={handleNewProject} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
        
        {/* Filters */}
        <Card className="w-full mb-4">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Search by name</label>
              <Input
                name="name"
                placeholder="Project name..."
                value={filters.name}
                onChange={handleFilterChange}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Select 
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as ProjectStatus | 'all' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button variant="outline" onClick={resetFilters} className="w-full sm:w-auto">
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card className="flex-1 flex flex-col overflow-hidden mt-0">
        <CardHeader className="px-4 sm:px-6 py-3 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold">Projects</h2>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-4 py-3 w-[30%]">Name</TableHead>
                  <TableHead className="px-4 py-3 w-[15%]">Status</TableHead>
                  <TableHead className="px-4 py-3 w-[20%]">Start Date</TableHead>
                  <TableHead className="px-4 py-3 w-[20%]">End Date</TableHead>
                  <TableHead className="px-4 py-3 text-right w-[15%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-muted/50">
                      <TableCell className="px-4 py-3 font-medium truncate max-w-[200px]">{project.name}</TableCell>
                      <TableCell className="px-4 py-3">{getStatusBadge(project.status)}</TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">{formatDate(project.startDate)}</TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">{formatDate(project.endDate)}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditProject(project)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setProjectToDelete(project)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No projects found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Project Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={editingProject || undefined}
            onSuccess={() => {
              setIsFormOpen(false);
              queryClient.invalidateQueries({ queryKey: ['project-manager-projects'] });
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the project "{projectToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectToDelete(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  );
}
