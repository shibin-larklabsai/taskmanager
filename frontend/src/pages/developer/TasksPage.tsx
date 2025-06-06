import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, updateTask, type Task, type TaskFilters } from '@/services/task.service';
import { Loader2, AlertCircle, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { format } from 'date-fns';
import api from '@/services/api';
import { AxiosError } from 'axios';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TaskWithProject = Task & {
  project?: {
    name: string;
  };
};

export function DeveloperTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Pagination state - show 6 projects per page
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 6,
    total: 0
  });
  
  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: Task['status'] }) => 
      updateTask(taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer-tasks'] });
    },
  });

  // Fetch the user's projects to get project IDs
  const { 
    data: userProjects = [], 
    error: projectsError, 
    isLoading: isLoadingProjects,
    refetch: refetchProjects
  } = useQuery<Array<{ id: number | string; [key: string]: any }>>({
    queryKey: ['user-projects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        console.log('Fetching projects for user ID:', user.id);
        const token = localStorage.getItem('token');
        console.log('Current auth token exists:', !!token);
        
        // Use the authenticated user's ID from the auth context
        const response = await api.get(`/users/me/projects`);
        return response.data;
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        console.error('Error fetching projects:', {
          message: axiosError.message,
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          config: {
            url: axiosError.config?.url,
            method: axiosError.config?.method,
            headers: axiosError.config?.headers
          }
        });
        
        // The interceptor will handle 401 errors
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  // Fetch tasks for the current user with filters and pagination
  const { 
    data: tasksData = { tasks: [], total: 0 }, 
    isLoading: isLoadingTasks, 
    error: tasksError, 
    refetch: refetchTasks 
  } = useQuery<{ tasks: TaskWithProject[], total: number }>({
    queryKey: ['developer-tasks', user?.id, userProjects, pagination.page, pagination.pageSize, statusFilter],
    queryFn: async () => {
      if (!user?.id || !userProjects.length) return { tasks: [], total: 0 };
      
      try {
        // Convert project IDs to numbers and filter out any invalid ones
        const projectIds = userProjects
          .map(project => typeof project.id === 'string' ? parseInt(project.id, 10) : Number(project.id))
          .filter(id => !isNaN(id));
        
        if (projectIds.length === 0) {
          return { tasks: [], total: 0 };
        }

        // Build filters
        const filters: TaskFilters = {
          projectIds,
          assignedToId: user.id,
          page: pagination.page,
          pageSize: pagination.pageSize,
        };

        // Add status filter if not 'all'
        if (statusFilter !== 'all') {
          filters.status = statusFilter as Task['status'];
        }

        // Use the getTasks with filters and pagination
        const { tasks, total } = await getTasks(filters);
        
        // Update total count
        setPagination(prev => ({
          ...prev,
          total
        }));
        
        return { tasks, total };
      } catch (err) {
        console.error('Error fetching tasks:', err);
        throw new Error('Failed to load tasks');
      }
    },
    enabled: !!user?.id && userProjects.length > 0,
    retry: 1,
    refetchOnWindowFocus: true,
  });
  
  const tasks = tasksData.tasks || [];
  const totalPages = Math.ceil(tasksData.total / pagination.pageSize);
  
  // Handle page change
  const handlePageChange = (page: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPagination(prev => ({
      ...prev,
      page
    }));
  };
  
  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    setPagination(prev => ({
      ...prev,
      pageSize: Number(value),
      page: 1 // Reset to first page
    }));
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPagination(prev => ({
      ...prev,
      page: 1 // Reset to first page when filter changes
    }));
  };

  if (isLoadingProjects || isLoadingTasks) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-gray-600">
          {isLoadingProjects ? 'Loading your projects...' : 'Loading your tasks...'}
        </span>
      </div>
    );
  }
  
  // Show error state if projects or tasks failed to load
  if (projectsError || tasksError) {
    const error = projectsError || tasksError;
    const refetch = projectsError ? refetchProjects : refetchTasks;
    
    return (
      <div className="p-4 bg-red-50 rounded-lg max-w-2xl mx-auto">
        <div className="flex items-start text-red-700">
          <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">
              Failed to load {projectsError ? 'projects' : 'tasks'}. Please try again.
            </p>
            {error instanceof Error && error.message && (
              <p className="text-sm text-red-600 mt-1">{error.message}</p>
            )}
          </div>
        </div>
        <button 
          onClick={() => refetch()} 
          className="mt-3 px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleStatusChange = async (status: Task['status']) => {
    if (!selectedTask) return;
    
    try {
      await updateStatusMutation.mutateAsync({
        taskId: selectedTask.id,
        status,
      });
      setSelectedTask((prev: Task | null) => prev ? { ...prev, status } : null);
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            Viewing tasks assigned to you across all projects
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Status:</span>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="TODO">To Do</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Show:</span>
            <Select 
              value={pagination.pageSize.toString()} 
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="48">48</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Task List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Task List Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
          <div className="col-span-5">Task</div>
          <div className="col-span-2">Project</div>
          <div className="col-span-1 text-center">Priority</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-2">Due Date</div>
          <div className="col-span-1"></div>
        </div>
        
        {/* Task Items */}
        {tasks.length === 0 && !isLoadingTasks && (
          <div className="p-6 text-center text-gray-500">
            No tasks found matching your criteria
          </div>
        )}
        
        {tasks.length > 0 && (
          <div className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleTaskClick(task)}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-0">
                  <div className="md:col-span-5 px-6 py-4">
                    <div className="font-medium text-gray-900">{task.title}</div>
                    <div className="text-sm text-gray-500 line-clamp-1">{task.description}</div>
                  </div>
                  <div className="md:col-span-2 px-6 py-4 flex items-center">
                    <div className="text-sm text-gray-900">{task.project?.name || 'N/A'}</div>
                  </div>
                  <div className="md:col-span-1 px-6 py-4 flex items-center justify-center">
                    <Badge 
                      variant={task.priority === 'HIGH' ? 'destructive' : task.priority === 'MEDIUM' ? 'secondary' : 'default'}
                      className="capitalize"
                    >
                      {task.priority?.toLowerCase() || 'N/A'}
                    </Badge>
                  </div>
                  <div className="md:col-span-1 px-6 py-4 flex items-center justify-center">
                    <Badge 
                      variant={
                        task.status === 'DONE' ? 'default' : 
                        task.status === 'IN_PROGRESS' ? 'secondary' : 
                        task.status === 'IN_REVIEW' ? 'default' : 'default'
                      }
                      className={`capitalize ${
                        task.status === 'DONE' ? 'bg-green-100 text-green-800' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        task.status === 'IN_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {task.status?.toLowerCase().replace('_', ' ') || 'N/A'}
                    </Badge>
                  </div>
                  <div className="md:col-span-2 px-6 py-4 flex items-center">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}
                    </div>
                  </div>
                  <div className="md:col-span-1 px-6 py-4 flex items-center justify-end">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (pagination.page > 1) handlePageChange(pagination.page - 1);
                    }}
                    className={pagination.page <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Always show 5 page numbers, centered around current page
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(pageNum);
                        }}
                        isActive={pageNum === pagination.page}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (pagination.page < totalPages) handlePageChange(pagination.page + 1);
                    }}
                    className={pagination.page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            
            <div className="mt-2 text-sm text-gray-500 text-center">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
              {Math.min(pagination.page * pagination.pageSize, tasksData.total)} of {tasksData.total} tasks
            </div>
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div 
                key={task.id} 
                className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="col-span-5">
                  <div className="font-medium text-gray-900">{task.title}</div>
                  <div className="text-sm text-gray-500 line-clamp-1">{task.description}</div>
                </div>
                <div className="col-span-2">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {task.project?.name || 'No Project'}
                  </div>
                </div>
                <div className="col-span-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                    task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <div className="col-span-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {task.status}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-gray-500">
                  {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedTask(task)}
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    View
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-400 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">No tasks found</h3>
              <p className="mt-1 text-sm text-gray-500">You don't have any tasks assigned to you yet.</p>
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskDetail
          task={{
            ...selectedTask,
            project: selectedTask.project || null,
          }}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

export default DeveloperTasksPage;
