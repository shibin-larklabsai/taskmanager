import { get } from '@/lib/api';

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserReference {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startDate: string | Date;
  endDate: string | Date | null;
  dueDate?: string | Date | null;
  taskCount?: number;
  createdById: number;
  creator?: UserReference;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export async function getUsers(): Promise<User[]> {
  try {
    const response = await fetch('http://localhost:8000/api/admin/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch users');
    }

    const data = await response.json();
    console.log('Users data from API:', data);
    return Array.isArray(data?.data) ? data.data : [];
  } catch (error) {
    console.error('Error in getUsers:', error);
    throw error;
  }
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  roleIds?: number[];
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  roleIds?: number[];
}

const API_BASE_URL = 'http://localhost:8000/api';

async function makeRequest<T>(url: string, options: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export async function createUser(userData: CreateUserData): Promise<User> {
  console.log('Creating user with data:', JSON.stringify(userData, null, 2));
  try {
    const response = await makeRequest<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    console.log('User created successfully:', response);
    return response;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(id: number, userData: UpdateUserData): Promise<User> {
  return makeRequest<User>(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
}

export async function deleteUser(id: number): Promise<void> {
  await makeRequest(`/admin/users/${id}`, {
    method: 'DELETE',
  });
}

export async function getUserRoles(): Promise<{ id: number; name: string }[]> {
  const response = await makeRequest<{ data: { id: number; name: string }[] }>('/admin/roles', {
    method: 'GET',
  });
  return response.data || [];
}

// User related functions are already defined above

// Role related functions
export async function getRoles(): Promise<Role[]> {
  const response = await get<{ data: Role[] }>('/admin/roles');
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createRole(roleData: Omit<Role, 'id'>): Promise<Role> {
  const response = await fetch('/admin/roles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(roleData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create role');
  }
  
  return response.json();
}

export async function updateRole(id: number, roleData: Partial<Role>): Promise<Role> {
  const response = await fetch(`/admin/roles/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(roleData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update role');
  }
  
  return response.json();
}

export async function deleteRole(id: number): Promise<void> {
  const response = await fetch(`/admin/roles/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete role');
  }
}

// Project related functions
export async function getProjects(): Promise<Project[]> {
  try {
    console.log('Fetching projects from:', `${API_BASE_URL}/projects`);
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      credentials: 'include',
    });
    
    const data = await response.json();
    console.log('Projects API response:', data);
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch projects');
    }
    
    // Handle both response formats: { data: [...] } and direct array
    const projects = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
    console.log(`Found ${projects.length} projects`);
    return projects;
  } catch (error) {
    console.error('Error in getProjects:', error);
    throw error;
  }
}

export async function createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
  console.log('Creating project with data:', JSON.stringify(projectData, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(projectData),
      credentials: 'include',
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Error response from server:', responseData);
      
      // Format validation errors if they exist
      if (responseData.errors && Array.isArray(responseData.errors)) {
        const errorMessages = responseData.errors.map((err: any) => 
          `${err.path ? `${err.path.join('.')}: ` : ''}${err.message}`
        ).join('\n');
        throw new Error(`Validation failed:\n${errorMessages}`);
      }
      
      throw new Error(responseData.message || 'Failed to create project');
    }
    
    return responseData;
  } catch (error) {
    console.error('Error in createProject:', error);
    throw error;
  }
}

export async function updateProject(projectId: number, projectData: Partial<Project>): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(projectData),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update project');
  }
  
  return response.json();
}

export async function deleteProject(projectId: number): Promise<void> {
  try {
    console.log(`Attempting to delete project with ID: ${projectId}`);
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      console.error('Delete project error:', {
        status: response.status,
        statusText: response.statusText,
        response: responseData,
      });
      
      if (response.status === 404) {
        throw new Error('Project not found or already deleted');
      } else if (response.status === 403) {
        throw new Error('You do not have permission to delete this project');
      } else {
        throw new Error(responseData.message || 'Failed to delete project');
      }
    }
    
    return responseData;
  } catch (error) {
    console.error('Error in deleteProject:', error);
    throw error;
  }
}
