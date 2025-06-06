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

// API Responses will be handled by the return type of each function

// Types for task filters
export interface TaskFilters {
  projectIds?: (number | string)[];
  assignedToId?: number | string;
  status?: Task['status'];
  priority?: Task['priority'];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API Calls
export async function getTasks(filters: TaskFilters = {}): Promise<{ tasks: Task[]; total: number }> {
  try {
    const params: Record<string, string> = {};
    
    // Apply filters
    if (filters.projectIds?.length) {
      params.projectIds = filters.projectIds.join(',');
    }
    if (filters.assignedToId) {
      params.assignedToId = String(filters.assignedToId);
    }
    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.priority) {
      params.priority = filters.priority;
    }
    
    // Add pagination
    if (filters.page !== undefined) {
      params.page = String(filters.page);
    }
    if (filters.pageSize !== undefined) {
      params.pageSize = String(filters.pageSize);
    }
    
    // Add sorting
    if (filters.sortBy) {
      params.sortBy = filters.sortBy;
      params.sortOrder = filters.sortOrder || 'asc';
    }
    
    const response = await api.get<{ tasks: Task[]; total: number }>('/tasks', { 
      params,
      paramsSerializer: {
        indexes: null // Ensures array indices are not included in the query string
      }
    });
    
    return {
      tasks: response.data.tasks || [],
      total: response.data.total || 0
    };
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

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
