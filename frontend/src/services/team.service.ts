import { get, post } from '@/lib/api';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedProjects?: Array<{
    id: string;
    name: string;
  }>;
}

export interface AssignProjectData {
  projectId: string;
  memberId: string;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const response = await get<TeamMember[]>('/team/members');
  return response.data;
}

export async function assignProjectToMember(data: AssignProjectData): Promise<void> {
  const { projectId, memberId } = data;
  await post<void>(`/team/members/${memberId}/assign-project`, { projectId });
}

export async function getTeamMemberProjects(memberId: string): Promise<Array<{ id: string; name: string }>> {
  const response = await get<Array<{ id: string; name: string }>>(`/team/members/${memberId}/projects`);
  return response.data;
}
