import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { assignProjectToMember, fetchProjects, updateProjectMember, removeProjectMember, type Project, type ProjectMember } from '@/services/teamService';
import { get } from '@/lib/api';
import { Pencil, Trash2 } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  createdAt?: string;
}

export function TeamAssignment() {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [editingAssignment, setEditingAssignment] = useState<{projectId: string, userId: string} | null>(null);

  // Fetch all projects
  const { data: allProjects = [], isLoading: isLoadingProjects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  // Fetch all users (project managers can now access this endpoint)
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['allUsers'],
    queryFn: async (): Promise<User[]> => {
      const response = await get<{ users: User[] }>('/users');
      return response.data?.users || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter planned projects and get all users
  const { plannedProjects, allUsersList } = useMemo(() => {
    const planned = allProjects.filter((project: Project) => project.status === 'PLANNING');
    
    // Filter only developers
    const usersList = allUsers
      .filter((user: User) => user.roles?.[0]?.toLowerCase() === 'developer')
      .map((user: User) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'Developer'
      }));
    
    return {
      plannedProjects: planned,
      allUsersList: usersList
    };
  }, [allProjects, allUsers]);
  
  const isLoading = isLoadingProjects || isLoadingUsers;
  
  // Group users by role for better organization in the dropdown
  const usersByRole = useMemo(() => {
    const grouped: Record<string, typeof allUsersList> = {};
    allUsersList.forEach(user => {
      if (!grouped[user.role]) {
        grouped[user.role] = [];
      }
      grouped[user.role].push(user);
    });
    return grouped;
  }, [allUsersList]);

  // Mutation for assigning project to developer
  const assignMutation = useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) => 
      assignProjectToMember(userId, projectId),
    onSuccess: () => {
      toast.success('Developer assigned to project successfully');
      setSelectedProject('');
      setSelectedUser('');
      setEditingAssignment(null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign developer: ${error.message}`);
    }
  });

  // Mutation for updating project member role
  const updateMemberMutation = useMutation({
    mutationFn: ({ projectId, userId, role }: { projectId: string; userId: string; role: string }) => 
      updateProjectMember(projectId, userId, role),
    onSuccess: () => {
      toast.success('Team member updated successfully');
      setEditingAssignment(null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update team member: ${error.message}`);
    }
  });

  // Mutation for removing project member
  const removeMemberMutation = useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) => 
      removeProjectMember(projectId, userId),
    onSuccess: () => {
      toast.success('Team member removed successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove team member: ${error.message}`);
    }
  });

  const handleAssign = () => {
    if (!selectedProject || !selectedUser) {
      toast.error('Please select both project and developer');
      return;
    }
    assignMutation.mutate({ projectId: selectedProject, userId: selectedUser });
  };

  const handleEdit = (projectId: string, userId: string) => {
    setEditingAssignment({ projectId, userId });
    setSelectedProject(projectId);
    setSelectedUser(userId);
  };

  const handleRemove = (projectId: string, userId: string) => {
    if (window.confirm('Are you sure you want to remove this team member from the project?')) {
      removeMemberMutation.mutate({ projectId, userId });
    }
  };

  const handleUpdate = () => {
    if (!selectedProject || !selectedUser) {
      toast.error('Please select both project and developer');
      return;
    }
    updateMemberMutation.mutate({ 
      projectId: selectedProject, 
      userId: selectedUser,
      role: 'DEVELOPER' // Default role for now, can be made dynamic if needed
    });
  };

  const handleCancelEdit = () => {
    setEditingAssignment(null);
    setSelectedProject('');
    setSelectedUser('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Assignment</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Assign Developer to Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {plannedProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Team Member</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(usersByRole).map(([role, users]) => (
                    <div key={role}>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}
                      </div>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-muted-foreground text-xs">
                              {user.email}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {editingAssignment && (
              <Button 
                variant="outline"
                onClick={handleCancelEdit}
                disabled={assignMutation.isPending || updateMemberMutation.isPending}
              >
                Cancel
              </Button>
            )}
            <Button 
              onClick={editingAssignment ? handleUpdate : handleAssign}
              disabled={!selectedProject || !selectedUser || assignMutation.isPending || updateMemberMutation.isPending}
            >
              {assignMutation.isPending || updateMemberMutation.isPending 
                ? (editingAssignment ? 'Updating...' : 'Assigning...') 
                : (editingAssignment ? 'Update Assignment' : 'Assign Team Member')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="min-w-[200px]">Project</TableHead>
                <TableHead className="min-w-[150px]">Developer</TableHead>
                <TableHead className="min-w-[200px]">Email</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                // Get all projects that have at least one member assigned
                const assignedProjects = plannedProjects.filter(
                  (project: Project) => project.projectMembers?.length > 0
                );

                if (assignedProjects.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No assignments found
                      </TableCell>
                    </TableRow>
                  );
                }

                // Flatten the array to show one row per project-member pair, excluding OWNER and TESTER roles
                const allMembers = assignedProjects.flatMap((project: Project) => 
                  (project.projectMembers || [])
                    .filter((member: ProjectMember) => 
                      member.role !== 'OWNER' && member.role !== 'TESTER'
                    )
                    .map((member: ProjectMember) => ({
                      project,
                      member
                    }))
                );

                if (allMembers.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        No team member assignments found
                      </TableCell>
                    </TableRow>
                  );
                }


                return allMembers.map(({ project, member }, index) => (
                  <TableRow key={`${project.id}-${member.userId}`}>
                    <TableCell className="font-medium w-12">{index + 1}</TableCell>
                    <TableCell className="min-w-[200px]">{project.name}</TableCell>
                    <TableCell className="min-w-[150px]">{member.user?.name || 'Unknown User'}</TableCell>
                    <TableCell className="min-w-[200px] text-ellipsis overflow-hidden">{member.user?.email || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(project.id.toString(), member.userId.toString())}
                          disabled={removeMemberMutation.isPending}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemove(project.id.toString(), member.userId.toString())}
                          disabled={removeMemberMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default TeamAssignment;
