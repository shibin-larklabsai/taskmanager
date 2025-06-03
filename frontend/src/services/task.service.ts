import api from './api';

// Types
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  projectId: number;
  /** @deprecated Use assignedToId instead */
  assigneeId?: number;
  assignedToId?: number;
  reporterId: number;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  reporter?: {
    id: number;
    name: string;
    email: string;
  };
  project?: {
    id: number;
    name: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    projectMembers?: Array<{
      id: number;
      role: string;
      user: {
        id: number;
        name: string;
        email: string;
      };
    }>;
  };
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  projectId: number;
  assigneeId?: number;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {}

// API Responses
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

// Types for task filters
export interface TaskFilters {
  projectIds?: (number | string)[];
  assignedToId?: number | string;
  status?: Task['status'];
  priority?: Task['priority'];
}

// API Calls
export const getTasks = async (filters?: TaskFilters): Promise<Task[]> => {
  const params = new URLSearchParams();
  
  if (filters?.projectIds?.length) {
    // Convert all project IDs to strings and join with commas
    const projectIdsStr = filters.projectIds.map(id => String(id)).join(',');
    params.append('projectIds', projectIdsStr);
  }
  
  if (filters?.assignedToId) {
    params.append('assignedToId', String(filters.assignedToId));
  }
  
  if (filters?.status) {
    params.append('status', filters.status);
  }
  
  if (filters?.priority) {
    params.append('priority', filters.priority);
  }
  
  const queryString = params.toString();
  const url = queryString ? `/tasks?${queryString}` : '/tasks';
  
  const response = await api.get<PaginatedResponse<Task>>(url);
  return response.data.data;
};

export const getTaskById = async (id: number): Promise<Task> => {
  const response = await api.get(`/tasks/${id}`);
  return response.data;
};

export const createTask = async (data: CreateTaskData): Promise<Task> => {
  const response = await api.post('/tasks', data);
  return response.data;
};

export const updateTask = async (id: number, data: UpdateTaskData): Promise<Task> => {
  const response = await api.patch(`/tasks/${id}`, data);
  return response.data;
};

export const deleteTask = async (id: number): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};

export const getProjectMembers = async (projectId: number) => {
  const response = await api.get(`/projects/${projectId}/members`);
  return response.data;
};
