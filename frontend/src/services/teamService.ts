import api from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ProjectMember {
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
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
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

export const fetchProjects = async (): Promise<Project[]> => {
  try {
    const response = await api.get<Project[]>('/projects');
    return response.data;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};

export const assignProjectToMember = async (memberId: string, projectId: string) => {
  try {
    const response = await api.post(`/projects/${projectId}/assign`, { userId: parseInt(memberId) });
    return response.data;
  } catch (error) {
    console.error('Error assigning project:', error);
    throw error;
  }
};
