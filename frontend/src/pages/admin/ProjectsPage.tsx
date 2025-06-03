import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProjects, createProject, updateProject, deleteProject, type Project } from '@/services/admin/admin.service';
import { toast } from 'sonner';
import { useState } from 'react';
import { ProjectForm, type ProjectFormData } from '@/components/admin/ProjectForm';
import { Trash2, Edit, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PLANNING', label: 'Planned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
] as const;

type StatusType = typeof statusOptions[number]['value'];

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  
  // Filter states
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusType>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const { 
    data: projects = [], 
    isLoading, 
    error,
    refetch,
    isRefetching
  } = useQuery<Project[]>({
    queryKey: ['admin', 'projects'],
    queryFn: getProjects,
    retry: 1
  });

  // Filter projects based on filters
  const filteredProjects = projects.filter((project) => {
    // Name filter (case-insensitive)
    const matchesName = project.name.toLowerCase().includes(nameFilter.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    // If no date filters are set, skip date filtering
    if (!startDate && !endDate) {
      return matchesName && matchesStatus;
    }

    // Get project dates
    const projectStartDate = project.startDate ? new Date(project.startDate) : null;
    const projectEndDate = project.dueDate ? new Date(project.dueDate) : projectStartDate;
    
    // If project has no dates, don't include it in date filtering
    if (!projectStartDate && !projectEndDate) {
      return false;
    }
    
    // Normalize filter dates
    const filterStart = startDate ? new Date(startDate) : null;
    const filterEnd = endDate ? new Date(endDate) : null;
    
    if (filterStart) filterStart.setHours(0, 0, 0, 0);
    if (filterEnd) filterEnd.setHours(23, 59, 59, 999);
    
    // Check if project date range overlaps with filter date range
    const projectStartsBeforeFilterEnd = !filterEnd || (projectStartDate && projectStartDate <= filterEnd);
    const projectEndsAfterFilterStart = !filterStart || (projectEndDate && projectEndDate >= filterStart);
    
    // Project is included if it has any overlap with the filter range
    const matchesDateRange = projectStartsBeforeFilterEnd && projectEndsAfterFilterStart;
    
    return matchesName && matchesStatus && matchesDateRange;
  });
  
  // Handle start date selection
  const handleStartDateSelect = (date: Date | undefined) => {
    setStartDate(date);
    // If end date is before the new start date, clear it
    if (date && endDate && date > endDate) {
      setEndDate(undefined);
    }
  };

  // Handle end date selection
  const handleEndDateSelect = (date: Date | undefined) => {
    // Only set end date if it's after start date or if there's no start date
    if (!startDate || !date || date >= startDate) {
      setEndDate(date);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setNameFilter('');
    setStatusFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  useEffect(() => {
    if (error) {
      console.error('Error loading projects:', error);
    }
  }, [error]);

  const createMutation = useMutation({
    mutationFn: (data: ProjectFormData) => createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      toast.success('Project created successfully');
      setIsFormOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'No date';
    return format(new Date(date), 'MMM d, yyyy');
  };

  const updateProjectMutation = useMutation({
    mutationFn: async (data: { projectId: number; projectData: Parameters<typeof updateProject>[1] }) => {
      try {
        const result = await updateProject(data.projectId, data.projectData);
        return result;
      } catch (error) {
        console.error('Error in updateProject mutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      toast.success('Project updated successfully');
    },
    onError: (error: Error) => {
      console.error('Update project error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update project';
      toast.error(errorMessage, { duration: 5000 });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('Starting delete mutation for project ID:', id);
      try {
        await deleteProject(id);
        return id;
      } catch (error) {
        console.error('Error in deleteProject mutation:', error);
        // Don't re-throw here, let onError handle it
        throw error;
      }
    },
    onMutate: async (projectId) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['admin', 'projects'] });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData<Project[]>(['admin', 'projects']) || [];

      // Optimistically update the cache
      queryClient.setQueryData<Project[]>(['admin', 'projects'], (old = []) => 
        old.filter(project => project.id !== projectId)
      );

      // Return a context object with the snapshotted value
      return { previousProjects };
    },
    onSuccess: (deletedId) => {
      console.log('Successfully deleted project with ID:', deletedId);
      toast.success('Project deleted successfully');
      setProjectToDelete(null);
    },
    onError: (error: Error, projectId, context) => {
      console.error('Delete project error:', error);
      
      // Revert the optimistic update on error
      if (context?.previousProjects) {
        queryClient.setQueryData(['admin', 'projects'], context.previousProjects);
      }
      
      // Show appropriate error message
      if (error.message.includes('not found') || error.message.includes('already deleted')) {
        toast.error('Project not found or already deleted');
        // Refresh the projects list to ensure we have the latest data
        queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
      } else if (error.message.includes('permission')) {
        toast.error('You do not have permission to delete this project');
      } else {
        toast.error(`Failed to delete project: ${error.message}`);
      }
    },
    onSettled: () => {
      // Always refetch after error or success, but don't wait for it
      queryClient.invalidateQueries({ queryKey: ['admin', 'projects'] });
    },
  });
  
  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Projects list refreshed');
    } catch (err) {
      toast.error('Failed to refresh projects');
    }
  };

  const handleEditProject = (project: Project) => {
    // Create a copy of the project to avoid mutating the original
    const projectCopy = { ...project };
    setSelectedProject(projectCopy);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    
    try {
      await deleteProjectMutation.mutateAsync(projectToDelete.id);
      toast.success('Project deleted successfully');
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedProject(null);
  };

  const handleSubmit = async (data: ProjectFormData) => {
    if (selectedProject && 'id' in data) {
      // For update, ensure we have the ID and merge with the form data
      updateProjectMutation.mutate({
        projectId: selectedProject.id,
        projectData: {
          ...data,
          // Ensure we don't send the ID in the projectData
          id: undefined
        }
      });
    } else {
      // For create, just pass the data as is
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 text-red-500">
        Error loading projects. <button onClick={() => refetch()} className="text-blue-500 hover:underline">Try again</button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Project Form Modal */}
      <ProjectForm
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        onSubmit={handleSubmit}
        initialData={selectedProject}
        isSubmitting={createMutation.isPending || updateProjectMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!projectToDelete} 
        onOpenChange={(open: boolean) => !open && setProjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project 
              <span className="font-semibold"> {projectToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProjectMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteProjectMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteProjectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Manage and filter projects
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading || isRefetching}
            >
              {isRefetching ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              onClick={() => {
                setSelectedProject(null);
                setIsFormOpen(true);
              }}
            >
              Add Project
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <Label htmlFor="name-filter">Project Name</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name-filter"
                  placeholder="Filter by name..."
                  className="pl-8"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                />
                {nameFilter && (
                  <X 
                    className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer"
                    onClick={() => setNameFilter('')}
                  />
                )}
              </div>
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select 
                value={statusFilter} 
                onValueChange={(value: StatusType) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status..." />
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
            
            <div className="md:col-span-4 space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal text-xs',
                        !startDate && 'text-muted-foreground',
                        'min-w-[120px]'
                      )}
                    >
                      <CalendarIcon className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {startDate ? format(startDate, 'MMM d') : 'Start'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal text-xs',
                        !endDate ? 'text-muted-foreground' : '',
                        'min-w-[120px]'
                      )}
                      disabled={!startDate}
                    >
                      <CalendarIcon className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {endDate ? format(endDate, 'MMM d') : 'End'}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateSelect}
                      initialFocus
                      disabled={(date) => startDate ? date < startDate : false}
                    />
                  </PopoverContent>
                </Popover>
                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStartDate(undefined);
                      setEndDate(undefined);
                    }}
                    className="h-9 w-9 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="md:col-span-2 flex items-end">
              {(nameFilter || statusFilter !== 'all' || startDate || endDate) && (
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                  className="h-10 w-full"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {(nameFilter || statusFilter !== 'all' || startDate || endDate) ? 'No projects match your filters' : 'No projects found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project, index) => (
                <TableRow key={project.id}>
                  <TableCell className="text-center text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                      {
                        'bg-blue-100 text-blue-800': project.status === 'PLANNING',
                        'bg-yellow-100 text-yellow-800': project.status === 'IN_PROGRESS',
                        'bg-green-100 text-green-800': project.status === 'COMPLETED',
                        'bg-red-100 text-red-800': project.status === 'CANCELLED',
                      }
                    )}>
                      {project.status.toLowerCase().replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(project.startDate)}</TableCell>
                  <TableCell>{project.endDate ? formatDate(project.endDate) : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditProject(project)}
                        disabled={updateProjectMutation.isPending}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive"
                        onClick={() => handleDeleteClick(project)}
                        disabled={deleteProjectMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default ProjectsPage;
