import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, updateTask, type Task } from '@/services/task.service';
import { Loader2, AlertCircle, Users, Calendar, Flag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { format } from 'date-fns';
import api from '@/services/api';
import { AxiosError } from 'axios';

export function DeveloperTasksPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
  
  // Fetch tasks for the current user with filters
  const { 
    data: tasks = [], 
    isLoading: isLoadingTasks, 
    error: tasksError, 
    refetch: refetchTasks 
  } = useQuery<Task[]>({
    queryKey: ['developer-tasks', user?.id, userProjects],
    queryFn: async () => {
      if (!user?.id || !userProjects.length) return [];
      
      try {
        console.log('Fetching tasks for user ID:', user.id);
        
        // Convert project IDs to numbers and filter out any invalid ones
        const projectIds: number[] = [];
        
        for (const project of userProjects) {
          const id = typeof project.id === 'string' 
            ? parseInt(project.id, 10) 
            : Number(project.id);
            
          if (!isNaN(id)) {
            projectIds.push(id);
          }
        }
        
        console.log('User project IDs:', projectIds);
        
        if (projectIds.length === 0) {
          console.log('No valid project IDs found');
          return [];
        }

        // Use the new getTasks with filters
        const tasks = await getTasks({
          projectIds,
          assignedToId: user.id
        });
        
        console.log('Filtered tasks from API:', tasks);
        return tasks;
      } catch (err) {
        console.error('Error fetching tasks:', err);
        throw new Error('Failed to load tasks');
      }
    },
    enabled: !!user?.id && userProjects.length > 0,
    retry: 1,
    refetchOnWindowFocus: true,
  });

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            Viewing tasks assigned to you across all projects
          </p>
        </div>
      </div>
      
      {/* Task List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Task List Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
          <div className="col-span-5">Task</div>
          <div className="col-span-2">Project</div>
          <div className="col-span-1 text-center">Priority</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-2">Due Date</div>
          <div className="col-span-1"></div>
        </div>
        
        {/* Task Items */}
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
