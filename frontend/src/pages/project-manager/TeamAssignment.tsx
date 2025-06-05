import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { assignProjectToMember, fetchProjects, updateProjectMember, removeProjectMember, type Project } from '@/services/teamService';

// Define ProjectMember with proper typing
interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  user?: UserWithRoles;
  createdAt?: string;
  updatedAt?: string;
}
import { get } from '@/lib/api';
import { Pencil, Trash2 } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

// Extended interface with optional roles for backward compatibility
interface UserWithRoles extends User {
  roles?: string[];
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
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery<UserWithRoles[]>({
    queryKey: ['allUsers'],
    queryFn: async (): Promise<User[]> => {
      const response = await get<{ users: User[] }>('/users');
      return response.data?.users || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get all projects and filter users
  const { allProjectsList, allUsersList } = useMemo(() => {
    // Get all projects with their current status
    const projectsList = allProjects.map((project: Project) => ({
      ...project,
      status: project.status || 'PLANNING' // Ensure status is always defined
    }));
    
    // Filter only developers
    const usersList = allUsers
      .filter((user: UserWithRoles) => {
        const userRole = user.role?.toLowerCase() || user.roles?.[0]?.toLowerCase() || '';
        return userRole === 'developer';
      })
      .map((user: UserWithRoles) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'Developer'
      }));
    
    return {
      allProjectsList: projectsList,
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

  // Get status badge with appropriate styling
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'PLANNING': { label: 'Planned', className: 'bg-blue-100 text-blue-800' },
      'IN_PROGRESS': { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
      'COMPLETED': { label: 'Completed', className: 'bg-green-100 text-green-800' },
      'CANCELLED': { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
    };

    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

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

    // Check if developer is already assigned to this project
    const project = allProjectsList.find(p => p.id.toString() === selectedProject);
    const isAlreadyAssigned = project?.projectMembers?.some(
      (member) => {
        if (member.userId.toString() !== selectedUser) return false;
        if (member.role === 'DEVELOPER') return true;
        
        if (!member.user) return false;
        
        const userRole = (member.user.role || '').toLowerCase();
        return userRole === 'developer';
      }
    ) as boolean;

    if (isAlreadyAssigned) {
      const developer = allUsersList.find(u => u.id.toString() === selectedUser);
      const projectName = project?.name || 'the project';
      toast.error(`Developer ${developer?.name || ''} is already assigned to ${projectName}`);
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
                  {allProjectsList
                    .filter((project: Project) => project.status === 'PLANNING' || project.status === 'IN_PROGRESS')
                    .map((project: Project) => (
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
                // Get all projects that have at least one developer member assigned
                const assignedProjects = allProjectsList.filter(
                  (project: Project) => 
                    project.projectMembers?.some(
                      (member: ProjectMember) => 
                        member.role === 'DEVELOPER' || 
                        (member.user?.roles?.[0]?.toLowerCase() === 'developer')
                    )
                );

                if (assignedProjects.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No developer assignments found
                      </TableCell>
                    </TableRow>
                  );
                }

                // Flatten the array to show one row per project-developer pair
                const allMembers = assignedProjects.flatMap((project: Project) => 
                  (project.projectMembers || [])
                    .filter((member: ProjectMember) => 
                      (member.role === 'DEVELOPER' || 
                       member.user?.roles?.[0]?.toLowerCase() === 'developer') &&
                      member.user // Ensure user data exists
                    )
                    .map((member: ProjectMember) => ({
                      project,
                      member,
                      user: allUsers.find(u => u.id === member.userId) || member.user
                    }))
                );

                if (allMembers.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No developer assignments found
                      </TableCell>
                    </TableRow>
                  );
                }

                // Sort by project status and name
                allMembers.sort((a, b) => {
                  // First sort by status order
                  const statusOrder: Record<string, number> = {
                    'IN_PROGRESS': 1,
                    'PLANNING': 2,
                    'COMPLETED': 3,
                    'CANCELLED': 4
                  };
                  const statusCompare = 
                    (statusOrder[a.project.status] || 99) - (statusOrder[b.project.status] || 99);
                  
                  // If same status, sort by project name
                  if (statusCompare === 0) {
                    return a.project.name.localeCompare(b.project.name);
                  }
                  return statusCompare;
                });


                return allMembers.map(({ project, member }, index) => (
                  <TableRow key={`${project.id}-${member.userId}`} className="hover:bg-muted/50">
                    <TableCell className="font-medium w-12">{index + 1}</TableCell>
                    <TableCell className="min-w-[200px]">
                      <div className="flex flex-col">
                        <span className="font-medium">{project.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {project.description?.substring(0, 50)}{project.description && project.description.length > 50 ? '...' : ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="flex flex-col">
                        <span>{member.user?.name || 'Unknown User'}</span>
                        <span className="text-xs text-muted-foreground">
                          {member.role}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[200px] text-ellipsis overflow-hidden">
                      {member.user?.email || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(project.status)}
                    </TableCell>
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
