import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { AlertCircle } from 'lucide-react';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Define types
type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'pending' | 'in_review' | 'blocked';

interface NotificationType {
  userIds: number[];
  title: string;
  message: string;
  type: string;
  link: string;
}

interface UserRole {
  id: number;
  name: string;
  description?: string;
}

interface User {
  id: number;
  name: string | null;
  email: string | null;
  roles?: UserRole[];
}

interface Comment {
  id: number | string;
  content: string;
  projectId: number;
  userId: number;
  user: User | { id: number; name: string | null; email: string | null };
  createdAt: string;
  updatedAt: string;
  isOptimistic?: boolean;
}

interface ProjectMember {
  id: number;
  role: string;
  user?: User | number;
}

interface Project {
  id: number;
  name: string;
  status: ProjectStatus;
  members?: ProjectMember[];
  testers?: ProjectMember[];
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

const useUpdateProjectStatus = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  return useMutation({
    mutationFn: async ({ projectId, status }: { projectId: number | string; status: string }) => {
      const response = await api.put(`/projects/${projectId}`, { status });
      if (socket) {
        socket.emit('project:status-updated', { projectId, status });
      }
      return response.data;
    },
    onMutate: async ({ projectId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['user-projects'] });

      const previousProjects = queryClient.getQueryData<Project[]>(['user-projects']);

      if (previousProjects) {
        queryClient.setQueryData<Project[]>(['user-projects'], (old = []) =>
          old.map((project) =>
            project.id === projectId
              ? { ...project, status } as Project
              : project
          )
        );
      }

      return { previousProjects };
    },
    onError: (_err: Error, _variables: { projectId: number | string; status: string }, context: { previousProjects?: Project[] } | undefined) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['user-projects'], context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-projects'] });
    },
  });
};

// Define types for comment mutations at the top level to avoid duplicates
type CreateCommentVariables = {
  projectId: number;
  content: string;
  userId: number;
};

type CreateCommentContext = {
  previousComments: Record<number, Comment[]>;
  optimisticComment?: Comment;
};

const ProjectsPage = () => {
  const { user } = useAuth() as { user: User | null };
  const { emitNotification } = useSocket() || {};
  const queryClient = useQueryClient();
  
  // State for comments and UI
  const [commentText, setCommentText] = useState('');
  const [commentingProject, setCommentingProject] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<{ id: string | number | null; content: string } | null>(null);
  const [projectComments, setProjectComments] = useState<Record<number, Comment[]>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Create comment mutation
  const createCommentMutation = useMutation<Comment, Error, CreateCommentVariables, CreateCommentContext>({
    mutationFn: async ({ projectId, content, userId }) => {
      const response = await api.post(`/comments`, {
        projectId,
        content,
        userId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectComments'] });
      setCommentText('');
      setCommentingProject(null);
      toast.success('Comment added successfully');
    },
    onError: (error: Error) => {
      console.error('Error creating comment:', error);
      toast.error('Failed to add comment');
    }
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/api/projects');
      return response.data;
    },
  });

  // Fetch and manage comments
  const { data: commentsData } = useQuery<Record<number, Comment[]>>({
    queryKey: ['projectComments'],
    queryFn: async () => {
      const response = await api.get('/api/comments');
      const data = response.data;
      const grouped = data.reduce((acc: Record<number, Comment[]>, comment: Comment) => {
        if (!acc[comment.projectId]) {
          acc[comment.projectId] = [];
        }
        acc[comment.projectId].push(comment);
        return acc;
      }, {});
      setProjectComments(grouped);
      return grouped;
    },
  });
  
  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number | string) => {
      const response = await api.delete(`/comments/${commentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectComments'] });
      toast.success('Comment deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  });
  
  // Handle comment submission
  const handleCommentSubmit = useCallback(async (e: React.FormEvent, projectId: number) => {
    e.preventDefault();
    if (!commentText.trim() || !user?.id) return;
    
    try {
      await createCommentMutation.mutateAsync({
        projectId,
        content: commentText,
        userId: user.id,
      });
    } catch (error) {
      console.error('Failed to post comment:', error);
      // Error handling is done in the mutation's onError
    }
  }, [commentText, user?.id, createCommentMutation]);
  
  // Handle comment deletion
  const handleDeleteComment = async (commentId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteCommentMutation.mutateAsync(commentId);
      } catch (error) {
        console.error('Failed to delete comment:', error);
        toast.error('Failed to delete comment');
      }
    }
  };

  const token = localStorage.getItem('token');
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <span className="text-gray-600">Authentication token not found. Please sign in again.</span>
      </div>
    );
  }

  // Update local state when commentsData changes
  useEffect(() => {
    if (commentsData && Object.keys(commentsData).length > 0) {
      // Only update if there are no optimistic updates in progress
      const hasOptimisticUpdates = Object.values(projectComments).some(
        (comments) => comments?.some((comment) => comment.isOptimistic) ?? false
      );

      if (!hasOptimisticUpdates) {
        setProjectComments(commentsData);
      }
    }
  }, [commentsData, projectComments]);

  // Function to send a test notification
  const sendTestNotification = useCallback(async (project: Project) => {
    if (!emitNotification) return;

    try {
      // Get all testers for the project
      const testers = (project?.members || []).filter((member) => 
        member.role === 'tester' || (member as any)?.role?.name === 'tester'
      );

      // Extract tester user IDs safely
      const testerIds = testers
        .map((tester) => {
          if (tester.user) {
            return typeof tester.user === 'object' ? tester.user.id : tester.user;
          }
          return null;
        })
        .filter((id): id is number => id !== null);

      if (testerIds.length > 0) {
        // Send notification to all testers
        await Promise.all(
          testerIds.map((testerId) =>
            emitNotification({
              userIds: [testerId],
              title: 'New Comment',
              message: `You have a new comment on project ${project.name || 'a project'}`,
              type: 'comment',
              link: `/projects/${project.id}`,
            } as NotificationType)
          )
        );
      }

      toast.success(`Notification sent to ${testerIds.length} testers`);
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send notification');
    }
  }, [emitNotification]);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create comment mutation with proper typing
  const createCommentMutation = useMutation<Comment, Error, CreateCommentVariables, CreateCommentContext>({
    mutationFn: async ({ projectId, content, userId }) => {
      const response = await api.post(`/comments`, {
        projectId,
        content,
        userId,
      });
      return response.data;
    },
    onMutate: async ({ projectId, content }) => {
      if (!user) return { projectId };

      await queryClient.cancelQueries({ queryKey: ['projectComments'] });

      const tempId = `temp-${Date.now()}`;
      const optimisticComment: Comment = {
        id: tempId,
        content,
        projectId,
        userId: user.id,
        user: user as User,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOptimistic: true,
      };

      // Optimistically update the UI
      setProjectComments((prev: Record<number, Comment[]>) => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), optimisticComment],
      }));

      // Find the project to get its testers
      const project = projects?.find((p) => p.id === projectId);
      if (project?.members && emitNotification) {
        project.members.forEach((member: ProjectMember) => {
          const memberUserId = typeof member.user === 'object' ? member.user?.id : member.user;
          if (member.role === 'tester' && memberUserId !== user?.id && memberUserId) {
            emitNotification({
              userIds: [memberUserId],
              title: 'New Comment',
              message: `${user?.name || 'A user'} commented on ${project.name}`,
              type: 'comment',
              link: `/projects/${projectId}`,
            });
          }
        });
      }

      return { optimisticComment, projectId };
    },
    onSuccess: (data: Comment, { projectId }: { projectId: number }) => {
      // Replace optimistic comment with server response
      setProjectComments((prev: Record<number, Comment[]>) => ({
        ...prev,
        [projectId]: (prev[projectId] || [])
          .filter((comment) => !comment.isOptimistic)
          .concat(data)
      }));
      
      // Find the project to get its testers
      const project = projects?.find(p => p.id === projectId);
      if (project?.testers && emitNotification) {
        project.testers.forEach((tester: ProjectMember) => {
          const testerUserId = typeof tester.user === 'object' ? tester.user?.id : tester.user;
          if (testerUserId && testerUserId !== user?.id) {
            emitNotification({
              userIds: [testerUserId],
              title: 'New Comment',
              message: `${user?.name || 'A user'} commented on ${project.name}`,
              type: 'comment',
              link: `/projects/${projectId}`
            });
          }
        });
      }
      
      setCommentText('');
      setCommentingProject(null);
      toast.success('Comment added successfully');
    },
    onError: (error: Error, variables: CreateCommentVariables, context?: CreateCommentContext) => {
      console.error('Failed to create comment:', error);
      // Revert optimistic update on error
      if (context?.optimisticComment) {
        setProjectComments(prev => ({
          ...prev,
          [variables.projectId]: (prev[variables.projectId] || [])
            .filter(comment => comment.id !== context.optimisticComment?.id)
        }));
      }
      toast.error('Failed to add comment');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projectComments'] });
    },
    onMutate: async (variables: CreateCommentVariables) => {
      const { projectId, content } = variables;
      if (!user) return { projectId };

      await queryClient.cancelQueries({ queryKey: ['projectComments'] });

      const tempId = `temp-${Date.now()}`;
      const optimisticComment: Comment = {
        id: tempId,
        content,
        projectId,
        userId: user.id,
        user: user as User,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOptimistic: true,
      };

      // Optimistically update the UI
      setProjectComments((prev: Record<number, Comment[]>) => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), optimisticComment],
      }));

      return { optimisticComment, projectId };
    },
    onSuccess: (data: Comment, variables: CreateCommentVariables) => {
      // Replace optimistic comment with server response
      setProjectComments((prev: Record<number, Comment[]>) => ({
        ...prev,
        [variables.projectId]: (prev[variables.projectId] || [])
          .filter((comment) => !comment.isOptimistic)
          .concat(data)
      }));
      
      // Find the project to get its testers
      const project = projects?.find((p: Project) => p.id === variables.projectId);
      if (project?.testers && emitNotification) {
        project.testers.forEach((tester: ProjectMember) => {
          const testerUserId = typeof tester.user === 'object' ? tester.user?.id : tester.user;
          if (testerUserId && testerUserId !== user?.id) {
            emitNotification({
              userIds: [testerUserId],
              title: 'New Comment',
              message: `${user?.name || 'A user'} commented on ${(project as Project).name}`,
              type: 'comment',
              link: `/projects/${variables.projectId}`
            });
          }
        });
      }
      
      setCommentText('');
      setCommentingProject(null);
      toast.success('Comment added successfully');
    },
    onError: (error: Error, variables: CreateCommentVariables, context?: CreateCommentContext) => {
      console.error('Failed to create comment:', error);
      // Revert optimistic update on error
      if (context?.optimisticComment) {
        setProjectComments(prev => ({
          ...prev,
          [variables.projectId]: (prev[variables.projectId] || [])
            .filter(comment => comment.id !== context.optimisticComment?.id)
        }));
      }
      toast.error('Failed to add comment');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projectComments'] });
    }
  });

  const handleCommentSubmit = async (e: React.FormEvent, projectId: number) => {
    e.preventDefault();
    if (!commentText.trim() || !user?.id) return;

    try {
      await createCommentMutation.mutateAsync({
        projectId,
        content: commentText,
      });
      
      // Notify project members about the new comment
      const project = projects?.find(p => p.id === projectId);
      if (project?.members) {
          try {
            // Get all testers who should be notified (except the comment author)
            const testersToNotify = project.members.filter((member: ProjectMember) => {
              if (member.id === user.id) return false;
              
              const role = member.role;
              if (!role) return false;
              
              // Handle both object and string role types
              if (typeof role === 'object' && 'name' in role) {
                return role.name?.toLowerCase() === 'tester';
              } else if (typeof role === 'string') {
                return role.toLowerCase() === 'tester';
              }
              return false;
            });
            
            // Send notifications to all testers
            testersToNotify.forEach(tester => {
              // Safely extract user ID from tester object
              let userId: string | number | undefined;
              
              if (tester && typeof tester === 'object') {
                if ('user' in tester && tester.user) {
                  userId = typeof tester.user === 'object' ? tester.user.id : tester.user;
                } else if ('id' in tester) {
                  userId = tester.id;
                }
              }
              
              if (!userId) return; // Skip if no valid user ID found
              
              // Create a mutable array for userIds
              const userIds = [userId];
              
              const notificationData = {
                userIds,
                title: 'New Comment',
                message: `New comment on project ${project.name}`,
                type: 'comment',
                projectId: project.id
              } as const;
              
              console.log('Sending notification with data:', notificationData);
              const notificationSent = emitNotification(notificationData);
              console.log('Notification send result:', notificationSent ? 'Success' : 'Failed');
              
              if (!notificationSent) {
                console.warn('Failed to send notification for new comment');
              }
            });
          } catch (notificationError) {
            console.error('Error sending notification:', notificationError);
            // Don't fail the comment submission if notification fails
          }
        }
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error('Failed to post comment. Please try again.');
    }
    
    setCommentText('');
    setCommentingProject(null);
  };

  const handleSaveEdit = useCallback(async (projectId: number) => {
    const currentEditingComment = editingComment;
    if (!currentEditingComment?.id || !currentEditingComment?.content?.trim()) {
      toast.error('Invalid comment data');
      return;
    }
    
    try {
      // Only make API call if it's not a temporary ID
      if (typeof editingComment.id === 'string' && editingComment.id.startsWith('temp-')) {
        toast.error('Please wait for the comment to be saved before editing');
        return;
      }

      // Update the comment in the UI immediately for better UX
      setProjectComments(prev => ({
        ...prev,
        [projectId]: prev[projectId]?.map(comment => 
          comment.id === editingComment.id 
            ? { ...comment, content: editingComment.content } 
            : comment
        ) || []
      }));
      
      // Update the comment on the server
      await api.put(`/comments/${editingComment.id}`, {
        content: editingComment.content
      });
      
      // Refresh comments from the server
      await queryClient.invalidateQueries({ queryKey: ['projectComments'] });
      
      setEditingComment(null);
      toast.success('Comment updated successfully');
    } catch (error) {
      console.error('Failed to update comment:', error);
      toast.error('Failed to update comment');
      
      // Revert the optimistic update on error
      await queryClient.invalidateQueries({ queryKey: ['projectComments'] });
    }
  }, [editingComment, queryClient]);

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Folder className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No projects found</h3>
        <p className="mt-1 text-sm text-gray-500">You don't have access to any projects yet.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'ACTIVE': { variant: 'default' as const, label: 'Active' },
      'IN_PROGRESS': { variant: 'default' as const, label: 'In Progress' },
      'ON_HOLD': { variant: 'secondary' as const, label: 'On Hold' },
      'COMPLETED': { variant: 'outline' as const, label: 'Completed' },
      'CANCELLED': { variant: 'destructive' as const, label: 'Cancelled' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: 'outline' as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, string> = {
      'OWNER': 'Owner',
      'MANAGER': 'Manager',
      'DESIGNER': 'Designer',
      'VIEWER': 'Viewer',
      // Return empty string for DEVELOPER role to hide the badge
      'DEVELOPER': ''
    };
    return roleMap[role] || role;
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
          <p className="text-muted-foreground">Manage your development projects and tasks</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select 
            value={statusFilter} 
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="PLANNING">Planning</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.isArray(projects) && projects
          .filter(project => statusFilter === 'all' || project.status === statusFilter)
          .sort((a, b) => {
            // Define the priority order for statuses
            const statusOrder = { 'PLANNING': 1, 'IN_PROGRESS': 2, 'COMPLETED': 3 };
            // Get the status priority, default to a high number if status is not in our list
            const aStatus = statusOrder[a.status as keyof typeof statusOrder] || 99;
            const bStatus = statusOrder[b.status as keyof typeof statusOrder] || 99;
            
            // If statuses are different, sort by status priority
            if (aStatus !== bStatus) return aStatus - bStatus;
            
            // If statuses are the same, sort alphabetically by name
            return a.name.localeCompare(b.name);
          })
          .map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <div className="flex space-x-2">
                  {getStatusBadge(project.status)}
                  {/* Only show role badge if it's not DEVELOPER */}
                  {project.role && project.role !== 'DEVELOPER' && (
                    <Badge variant="outline">{getRoleBadge(project.role)}</Badge>
                  )}
                </div>
              </div>
              {project.description && (
                <CardDescription className="line-clamp-2">
                  {project.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm text-gray-600">
                {(project.startDate || project.endDate) && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span>
                      {project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'No start date'}
                      {project.endDate && ` - ${format(new Date(project.endDate), 'MMM d, yyyy')}`}
                    </span>
                  </div>
                )}
                {/* Status selector */}
                {project.role === 'DEVELOPER' && (
                  <div className="mt-2">
                    <Select
                      value={project.status}
                      onValueChange={(value) => handleStatusChange(project.id, value)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Change project status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PLANNING">Planned</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedProject(project)}
                className="text-blue-600 hover:bg-blue-50"
              >
                View Details
              </Button>
              <Button 
                variant={commentingProject?.id === project.id ? "secondary" : "outline"} 
                size="sm" 
                onClick={() => {
                  setCommentingProject(commentingProject?.id === project.id ? null : project);
                  setCommentText('');
                }}
                className="flex items-center gap-1"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{commentingProject?.id === project.id ? 'Cancel' : 'Comment'}</span>
              </Button>
            </CardFooter>
            {commentingProject?.id === project.id && (
              <div className="p-4 border-t">
                <form onSubmit={(e) => handleCommentSubmit(e, project.id)} className="space-y-2">
                  <Textarea
                    placeholder="Write your comment here..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[80px] text-sm"
                    autoFocus
                    disabled={createCommentMutation.status === 'pending'}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!commentText.trim() || createCommentMutation.status === 'pending'}
                    >
                      {createCommentMutation.status === 'pending' ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Comments dropdown */}
            <div className="border-t mt-4">
              <details className="group">
                <summary className="flex justify-between items-center p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {projectComments[project.id]?.length || 0} {projectComments[project.id]?.length === 1 ? 'Comment' : 'Comments'}
                    </span>
                  </div>
                  <svg
                    className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>
                <div className="mt-2">
                  {projectComments[project.id]?.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No comments yet. Be the first to comment!
                    </div>
                  ) : (
                    projectComments[project.id]?.map((comment) => (
                      <div key={comment.id} className="p-4 border-b last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm">
                                {typeof comment.user === 'object' ? comment.user.name : 'Unknown User'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                              <Textarea
                                value={editingComment.content}
                                onChange={(e) => setEditingComment({...editingComment, content: e.target.value})}
                                className="w-full min-h-[80px] text-sm"
                                autoFocus
                              />
                              <div className="flex justify-end space-x-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingComment({id: null, content: ''})}
                                  disabled={updateCommentMutation.status === 'pending'}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => updateCommentMutation.mutate({
                                    commentId: comment.id,
                                    content: editingComment.content
                                  })}
                                  disabled={!editingComment.content.trim() || updateCommentMutation.status === 'pending'}
                                >
                                  {updateCommentMutation.status === 'pending' ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4 mr-1" />
                                  )}
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1 text-sm">{comment.content}</p>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          {(() => {
                            if (String(user?.id) === String(comment.user.id)) {
                              return (
                                <>
                                  <button
                                    onClick={() => setEditingComment({id: comment.id, content: comment.content})}
                                    className="text-muted-foreground hover:text-primary p-1 rounded-full hover:bg-muted"
                                    title="Edit comment"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteComment(comment.id, e)}
                                    className="text-muted-foreground hover:text-destructive p-1 rounded-full hover:bg-muted"
                                    title="Delete comment"
                                    disabled={deleteCommentMutation.status === 'pending'}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              );
                            } else if (user?.roles?.some((role: UserRole) => 
                              ['admin', 'project_manager'].includes(role?.name || '')
                            )) {
                              return (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => handleDeleteComment(comment.id, e)}
                                  disabled={deleteCommentMutation.status === 'pending'}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </Card>
        ))}
      </div>

      <ProjectDetailsDialog 
        project={selectedProject} 
        onOpenChange={(open) => !open && setSelectedProject(null)} 
      />
    </div>
  );
}

export default ProjectsPage;
