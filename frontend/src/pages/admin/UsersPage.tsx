import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUsers, createUser, updateUser, deleteUser, getUserRoles } from '@/services/admin/admin.service';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import { UserForm } from '@/components/admin/UserForm';
import { Loader2, Edit2 as Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Define Role interface
export interface Role {
  id: number;
  name: string;
  code?: string;
}

// Define User interface
export interface User {
  id: number;
  name: string;
  email: string;
  roles: (string | Role)[];
  createdAt: string;
  updatedAt: string;
}

// Extend User interface for our component
export interface UserWithRoles extends User {
  roles: (string | Role)[];
  level?: number;
  isExpanded?: boolean;
}

// Define role hierarchy (from highest to lowest)
const ROLE_HIERARCHY = [
  'ADMIN',
  'PROJECT_MANAGER',
  'DEVELOPER',
  'TESTER',
  'USER'
];

// Helper to get role name from role (string or Role object)
const getRoleName = (role: string | Role): string => {
  return typeof role === 'string' ? role : role.name;
};

// Get the highest role for a user
const getHighestRole = (roles: (string | Role)[]): string => {
  if (!roles || roles.length === 0) return 'USER';
  
  // Convert all roles to strings for comparison
  const roleNames = roles.map(role => getRoleName(role));
  
  for (const role of ROLE_HIERARCHY) {
    if (roleNames.includes(role)) {
      return role;
    }
  }
  
  return 'USER';
};

// Sort users by role hierarchy
function sortUsersByHierarchy(users: UserWithRoles[]): UserWithRoles[] {
  return [...users].sort((a, b) => {
    const highestRoleA = getHighestRole(a.roles);
    const highestRoleB = getHighestRole(b.roles);
    
    const indexA = ROLE_HIERARCHY.indexOf(highestRoleA);
    const indexB = ROLE_HIERARCHY.indexOf(highestRoleB);
    
    if (indexA === indexB) {
      return a.name.localeCompare(b.name);
    }
    
    return indexA - indexB;
  }).map(user => ({
    ...user,
    level: ROLE_HIERARCHY.indexOf(getHighestRole(user.roles))
  }));
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  
  // Filter states
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Get available roles for filter
  const { data: availableRoles = [] } = useQuery<Role[]>({
    queryKey: ['userRoles'],
    queryFn: () => getUserRoles() as Promise<Role[]>,
  });
  
  const { data: users = [], isLoading } = useQuery<UserWithRoles[]>({
    queryKey: ['users'],
    queryFn: getUsers as () => Promise<UserWithRoles[]>,
  });
  
  // Define role priority for sorting
  const getRolePriority = (role: Role | string): number => {
    const roleName = typeof role === 'string' ? role.toLowerCase() : (role.name || '').toLowerCase();
    
    if (roleName.includes('admin')) return 1;
    if (roleName.includes('project') && roleName.includes('manager')) return 2;
    if (roleName.includes('developer')) return 3;
    if (roleName.includes('tester')) return 4;
    return 5; // Default for other roles or no role
  };

  // Sort users by role priority
  const sortedUsers = useMemo(() => {
    // Create a copy of users array to avoid mutating the original
    return [...users].sort((a, b) => {
      // Get the highest priority role for each user
      const aRoles = Array.isArray(a.roles) ? a.roles : [];
      const bRoles = Array.isArray(b.roles) ? b.roles : [];
      
      // Find highest priority role for user A
      const aPriority = aRoles.length > 0 
        ? Math.min(...aRoles.map(role => getRolePriority(role)))
        : 999; // No role has lowest priority
        
      // Find highest priority role for user B
      const bPriority = bRoles.length > 0 
        ? Math.min(...bRoles.map(role => getRolePriority(role)))
        : 999; // No role has lowest priority
      
      // Sort by role priority first, then by name
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same role priority, sort by name
      return a.name.localeCompare(b.name);
    });
  }, [users]);
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully!');
      setIsFormOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    },
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: { id: number; userData: any }) => updateUser(data.id, data.userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully!');
      setIsFormOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully!');
      setUserToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });
  
  // Handle form submission
  const handleSubmit = async (userData: any) => {
    try {
      // Make sure roleIds is an array
      if (userData.roleIds && !Array.isArray(userData.roleIds)) {
        userData.roleIds = [userData.roleIds];
      }
      
      if (selectedUser) {
        await updateUserMutation.mutateAsync({ id: selectedUser.id, userData });
      } else {
        await createUserMutation.mutateAsync(userData);
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };
  
  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (userToDelete) {
      try {
        await deleteUserMutation.mutateAsync(userToDelete.id);
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };
  
  // Handle reset filters
  const handleResetFilters = () => {
    setNameFilter('');
    setEmailFilter('');
    setRoleFilter('all');
  };
  
  // Format role for display
  const formatRoleDisplay = (role: string | Role | undefined): string => {
    if (!role) return 'No role';
    if (typeof role === 'string') return role;
    return role.name || role.code || 'No role';
  };
  
  // Filter users based on search criteria
  const filteredUsers = useMemo(() => {
    return sortedUsers.filter(user => {
      const matchesName = !nameFilter || 
        user.name.toLowerCase().includes(nameFilter.toLowerCase());
      const matchesEmail = !emailFilter || 
        user.email.toLowerCase().includes(emailFilter.toLowerCase());
      const matchesRole = roleFilter === 'all' || 
        user.roles.some(role => getRoleName(role) === roleFilter);
      
      return matchesName && matchesEmail && matchesRole;
    });
  }, [sortedUsers, nameFilter, emailFilter, roleFilter]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={() => {
          setSelectedUser(null);
          setIsFormOpen(true);
        }}>
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="name-filter">Name</Label>
            <Input
              id="name-filter"
              placeholder="Filter by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email-filter">Email</Label>
            <Input
              id="email-filter"
              placeholder="Filter by email..."
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="role-filter">Role</Label>
            <Select
              value={roleFilter}
              onValueChange={(value) => setRoleFilter(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {availableRoles.map((role) => (
                  <SelectItem
                    key={getRoleName(role)}
                    value={getRoleName(role)}
                  >
                    {formatRoleDisplay(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(nameFilter || emailFilter || roleFilter !== 'all') && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="mt-2"
          >
            Reset Filters
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">#</TableHead>
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {nameFilter || emailFilter || roleFilter !== 'all'
                    ? 'No users match your filters'
                    : 'No users found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user, index) => (
                <TableRow key={user.id}>
                  <TableCell className="text-center text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center" style={{ paddingLeft: `${Math.max(0, user.level || 0) * 20}px` }}>
                      <span>{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(user.roles) && user.roles.length > 0 ? (
                        user.roles.map((role) => {
                          const roleName = getRoleName(role);
                          const roleDisplay = formatRoleDisplay(role);
                          const isHighestRole = roleName === getHighestRole(user.roles);

                          return (
                            <span
                              key={roleName}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isHighestRole
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {roleDisplay}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-muted-foreground text-xs">No roles assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUserToDelete(user)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* User Form */}
      <UserForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedUser(null);
        }}
        initialData={selectedUser ? {
          id: selectedUser.id,
          name: selectedUser.name,
          email: selectedUser.email,
          roles: selectedUser.roles.map((role) => getRoleName(role))
        } : undefined}
        onSubmit={handleSubmit}
        isSubmitting={createUserMutation.isPending || updateUserMutation.isPending}
        isLoading={createUserMutation.isPending || updateUserMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default UsersPage;
