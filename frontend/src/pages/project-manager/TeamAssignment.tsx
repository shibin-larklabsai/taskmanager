import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { fetchProjects, assignProjectToMember } from '@/services/teamService';

interface User {
  id: number;
  name: string;
  email: string;
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

interface Project {
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

interface TeamMember extends User {
  role: string;
  assignedProjects?: Array<{
    id: number;
    name: string;
  }>;
}

export function TeamAssignment() {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  // Only show planned projects in the dropdown

  // Mock data for development
  // Fetch team members and projects
  const { data: projectsData = [], isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    select: (data) => Array.isArray(data) ? data : []
  });

  // Transform project members into team members
  const teamMembers = useMemo(() => {
    const membersMap = new Map<number, TeamMember>();
    
    projectsData.forEach((project: Project) => {
      project.projectMembers.forEach((member: ProjectMember) => {
        if (!membersMap.has(member.userId)) {
          membersMap.set(member.userId, {
            ...member.user,
            role: member.role,
            assignedProjects: []
          });
        }
        const teamMember = membersMap.get(member.userId)!;
        teamMember.assignedProjects = [
          ...(teamMember.assignedProjects || []),
          {
            id: project.id,
            name: project.name
          }
        ];
      });
    });

    return Array.from(membersMap.values());
  }, [projectsData]);

  // Filter projects to show only planned projects (case-sensitive check)
  const plannedProjects = useMemo(() => {
    console.log('All projects:', projectsData); // Debug log
    const filtered = projectsData
      .filter((project: Project) => {
        console.log(`Project ${project.name} status:`, project.status); // Debug log
        return project.status === 'PLANNED';
      })
      .map(project => ({
        id: project.id,
        name: project.name,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate
      }));
    console.log('Filtered planned projects:', filtered); // Debug log
    return filtered;
  }, [projectsData]);

  const isLoadingMembers = isLoadingProjects;

  // Assign project mutation
  const assignMutation = useMutation({
    mutationFn: async ({ projectId, memberId }: { projectId: string; memberId: string }) => {
      return assignProjectToMember(memberId, projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setSelectedProject('');
      setSelectedMember('');
      toast.success('Project assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign project');
    },
  });

  const handleAssignProject = () => {
    if (!selectedProject || !selectedMember) {
      toast.error('Please select both project and team member');
      return;
    }
    assignMutation.mutate({ 
      projectId: selectedProject, 
      memberId: selectedMember
    });
  };

  if (isLoadingMembers || isLoadingProjects) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Team Assignment</h1>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign Project to Team Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Project</label>
              <Select 
                value={selectedProject}
                onValueChange={setSelectedProject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {plannedProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                  {plannedProjects.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No projects found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Team Member</label>
              <Select 
                value={selectedMember}
                onValueChange={setSelectedMember}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleAssignProject}
                disabled={!selectedProject || !selectedMember || assignMutation.isPending}
              >
                {assignMutation.isPending ? 'Assigning...' : 'Assign Project'}
              </Button>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4">Current Assignments</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead>Assigned Projects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>
                        {member.assignedProjects && member.assignedProjects.length > 0 ? (
                          <div className="space-y-1">
                            {member.assignedProjects.map((project) => (
                              <div key={project.id} className="flex items-center">
                                <span className="mr-2">•</span>
                                <span>{project.name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No projects assigned</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center">
                      No team members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default TeamAssignment;
