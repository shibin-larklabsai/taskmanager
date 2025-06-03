import api from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  startDate: string;
  endDate: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  creator: User;
  projectMembers: ProjectMember[];
}

export interface TeamMember extends User {
  assignedProjects?: Array<{
    id: number;
    name: string;
  }>;
}

export interface ProjectsResponse {
  data: Project[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
  success: boolean;
}

export const fetchProjects = async (): Promise<Project[]> => {
  try {
    const response = await api.get<ProjectsResponse>('/projects');
    // Return the data array from the response
    return response.data?.data || [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};

export const assignProjectToMember = async (memberId: string, projectId: string) => {
  try {
    console.log(`[assignProjectToMember] Starting assignment - User: ${memberId}, Project: ${projectId}`);
    
    // Log current auth token for debugging
    const token = localStorage.getItem('token');
    console.log('[assignProjectToMember] Auth token exists:', !!token);
    
    // Log the full request URL and payload
    const requestUrl = `/projects/${projectId}/members/${memberId}`;
    const requestPayload = { role: 'DEVELOPER' };
    
    console.log('[assignProjectToMember] Making request:', {
      url: requestUrl,
      method: 'POST',
      payload: requestPayload,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : 'No token'
      }
    });
    
    const response = await api.post(requestUrl, requestPayload);
    
    console.log('[assignProjectToMember] Assignment successful:', {
      status: response.status,
      data: response.data
    });
    
    return response.data;
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      response: error.response?.data,
      request: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
        headers: {
          ...error.config?.headers,
          // Don't log the full token for security
          Authorization: error.config?.headers?.Authorization ? 'Bearer [token]' : 'No token'
        }
      }
    };
    
    console.error('[assignProjectToMember] Error details:', JSON.stringify(errorDetails, null, 2));
    
    // Extract a more detailed error message
    let errorMessage = 'Failed to assign project';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.status === 403) {
      errorMessage = 'You do not have permission to perform this action. Please check your user role and project permissions.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication required. Please log in again.';
    }
    
    throw new Error(errorMessage);
  }
};

export const updateProjectMember = async (projectId: string, userId: string, role: string) => {
  try {
    const response = await api.put(`/projects/${projectId}/members/${userId}`, { role });
    return response.data;
  } catch (error: any) {
    console.error('Error updating project member:', error);
    const errorMessage = error.response?.data?.message || 'Failed to update project member';
    throw new Error(errorMessage);
  }
};

export const removeProjectMember = async (projectId: string, userId: string) => {
  try {
    const response = await api.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error removing project member:', error);
    const errorMessage = error.response?.data?.message || 'Failed to remove project member';
    throw new Error(errorMessage);
  }
};
