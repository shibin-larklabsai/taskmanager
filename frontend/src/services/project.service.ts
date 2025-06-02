import api from '@/lib/api';

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface CreateProjectData {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
  id: number;
}

export interface Creator {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | Date | null;
  endDate: string | Date | null;
  createdAt: string;
  updatedAt: string;
  createdById: number;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  createdBy?: Creator; // Keep for backward compatibility
  progress?: number;
  members?: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
  }>;
  tasks?: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
  }>;
  projectMembers?: Array<{
    id: number;
    projectId: number;
    userId: number;
    role: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  planning: number;
  cancelled: number;

}

export const getProjects = async (includeAll: boolean = true): Promise<Project[]> => {
  try {
    console.log('Fetching projects from API...');
    const response = await api.get<ApiResponse<Project[]>>('/projects', {
      params: { includeAll },
      transformRequest: [(data, headers) => {
        console.log('Request headers:', headers);
        return data;
      }]
    });
    
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    
    // Log the raw response data structure
    console.log('Raw API response data structure:', JSON.stringify(response.data, null, 2));
    
    // The backend returns projects directly in response.data.data
    if (response.data?.success && Array.isArray(response.data.data)) {
      console.log(`Successfully fetched ${response.data.data.length} projects`);
      // Log the first project's structure
      if (response.data.data.length > 0) {
        console.log('First project in response:', JSON.stringify(response.data.data[0], null, 2));
      }
      return response.data.data;
    }
    
    console.warn('Unexpected response format:', response.data);
    return [];
  } catch (error: any) {
    console.error('Error in getProjects:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config ? {
        url: error.config.url,
        baseURL: error.config.baseURL,
        method: error.config.method,
        headers: error.config.headers
      } : undefined
    });
    throw new Error(error.response?.data?.message || 'Failed to fetch projects');
  }
};

export const getProjectById = async (id: number): Promise<Project> => {
  try {
    const response = await api.get<ApiResponse<{ project: Project }>>(`/projects/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data as unknown as Project;
    }
    throw new Error('Project not found');
  } catch (error) {
    console.error(`Error fetching project ${id}:`, error);
    throw error;
  }
};

export const createProject = async (projectData: CreateProjectData): Promise<Project> => {
  try {
    const response = await api.post<ApiResponse<{ project: Project }>>('/projects', projectData);
    if (response.data.success && response.data.data) {
      return response.data.data.project;
    }
    throw new Error('Failed to create project');
  } catch (error: any) {
    console.error('Error creating project:', error);
    throw new Error(error.response?.data?.message || 'Failed to create project');
  }
};

export const updateProject = async (projectData: UpdateProjectData): Promise<Project> => {
  try {
    const { id, ...updateData } = projectData;
    const response = await api.put<ApiResponse<{ project: Project }>>(`/projects/${id}`, updateData);
    if (response.data.success && response.data.data) {
      return response.data.data.project;
    }
    throw new Error('Failed to update project');
  } catch (error: any) {
    console.error('Error updating project:', error);
    throw new Error(error.response?.data?.message || 'Failed to update project');
  }
};

export const deleteProject = async (id: number): Promise<boolean> => {
  try {
    const response = await api.delete<ApiResponse<{ success: boolean }>>(`/projects/${id}`);
    if (response.data.success) {
      return true;
    }
    throw new Error('Failed to delete project');
  } catch (error: any) {
    console.error('Error deleting project:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete project');
  }
};

export const getProjectStats = async (): Promise<ProjectStats> => {
  try {
    // For now, we'll calculate stats from the projects list
    const projects = await getProjects();
    
    return {
      total: projects.length,
      active: projects.filter(p => p.status === 'IN_PROGRESS').length,
      completed: projects.filter(p => p.status === 'COMPLETED').length,
      planning: projects.filter(p => p.status === 'PLANNING').length,
      cancelled: projects.filter(p => p.status === 'CANCELLED').length,

    };
  } catch (error) {
    console.error('Error calculating project stats:', error);
    return {
      total: 0,
      active: 0,
      completed: 0,
      planning: 0,
      cancelled: 0,

    };
  }
};
