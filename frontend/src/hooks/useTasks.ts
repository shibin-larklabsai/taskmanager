import { useQuery } from '@tanstack/react-query';
import { getTasks, Task, TaskStatus, TaskPriority } from '@/services/task.service';

interface UseTasksOptions {
  projectId?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: number;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useTasks({
  projectId,
  status,
  priority,
  assigneeId,
  searchQuery,
  page = 1,
  pageSize = 10,
  sortBy = 'dueDate',
  sortOrder = 'asc',
}: UseTasksOptions = {}) {
  return useQuery({
    queryKey: [
      'tasks', 
      { 
        projectId, 
        status, 
        priority, 
        assigneeId, 
        searchQuery, 
        page, 
        pageSize, 
        sortBy, 
        sortOrder 
      }
    ],
    queryFn: () => 
      getTasks({
        projectId,
        status,
        priority,
        assigneeId,
        searchQuery,
        page,
        pageSize,
        sortBy,
        sortOrder,
      }),
    keepPreviousData: true,
  });
}
