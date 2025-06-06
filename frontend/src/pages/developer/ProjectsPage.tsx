import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { Loader2, AlertCircle, Calendar, Folder, MessageSquare, Trash2, Edit2, X, Save } from 'lucide-react'; 
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import api from '@/services/api';
import { ProjectDetailsDialog } from '@/components/projects/ProjectDetailsDialog';
import type { Project } from '@/types/project';
import { Comment, createComment, getProjectsComments, deleteComment } from '@/services/comment.service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type UserRole = {
  id: number;
  name: string;
  description?: string;
};

interface User {
  id: number | string;
  name: string;
  email: string;
  roles?: UserRole[];
}

interface ProjectMember {
  id: number | string;
  role: string | UserRole;
  user?: User;
};

type CommentMutationVariables = {
  projectId: number;
  content: string;
};



// Custom hook for project status updates
function useUpdateProjectStatus() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  
  return useMutation({
    mutationFn: async ({ projectId, status }: { projectId: number|string; status: string }) => {
      const response = await api.put(`/projects/${projectId}`, { status });
      // Emit event to notify other clients
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
          old.map(project => 
            project.id === projectId 
              ? { ...project, status }
              : project
          )
        );
      }
      
      return { previousProjects };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(['user-projects'], context.previousProjects);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-projects'] });
    },
  });
}

export function ProjectsPage() {
  const { user } = useAuth() as { user: User | null };
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [commentingProject, setCommentingProject] = useState<Project | null>(null);
  const [commentText, setCommentText] = useState('');
  const [projectComments, setProjectComments] = useState<Record<number, Comment[]>>({});
  const [editingComment, setEditingComment] = useState<{id: number | null, content: string}>({id: null, content: ''});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const updateProjectStatus = useUpdateProjectStatus();
  const { socket, emitNotification } = useSocket();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Function to send a test notification
  const sendTestNotification = useCallback(() => {
    if (!socket || !emitNotification) {
      toast.error('WebSocket not connected');
      return;
    }
    
    const testNotification = {
      userIds: [], // Empty array will be treated as broadcast
      message: 'This is a test notification from the developer',
      type: 'test',
      projectId: selectedProject?.id || 0,
      link: selectedProject?.id ? `/projects/${selectedProject.id}` : '/',
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        projectName: selectedProject?.name || 'Test Project'
      }
    };
    
    console.log('Sending test notification:', testNotification);
    const success = emitNotification(testNotification);
    if (success) {
      toast.success('Test notification sent to all testers!');
    } else {
      toast.error('Failed to send test notification');
    }
  }, [socket, selectedProject, emitNotification]);

  // Fetch the user's projects
  const { 
    data: projects = [], 
    error: projectsError, 
    isLoading: isLoadingProjects,
    refetch: refetchProjects 
  } = useQuery<Project[]>({
    queryKey: ['user-projects', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('No user ID, returning empty projects array');
        return [];
      }
      
      try {
        console.log('Fetching projects for user:', user.id);
        console.log('Auth token:', localStorage.getItem('token'));
        
        const response = await api.get(`/users/me/projects`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('Projects API response status:', response.status);
        console.log('Projects API response data:', response.data);
        
        if (!response.data) {
          console.warn('Empty response data from projects API');
          return [];
        }
        
        return response.data.data || response.data || [];
      } catch (error: any) {
        console.error('Failed to fetch projects:', error);
        if (error.response) {
          console.error('Error response data:', error.response.data);
          console.error('Error status:', error.response.status);
        }
        throw error;
      }
    },
    enabled: !!user?.id,
  });

  // Fetch comments for all projects in a single request
  useEffect(() => {
    const fetchAllComments = async () => {
      if (projects?.length) {
        try {
          const projectIds = projects.map(p => p.id);
          const commentsMap = await getProjectsComments(projectIds);
          setProjectComments(commentsMap);
        } catch (error) {
          console.error('Failed to fetch project comments:', error);
          // Fallback to empty comments on error
          const emptyComments = projects.reduce((acc, project) => ({
            ...acc,
            [project.id]: []
          }), {} as Record<number, Comment[]>);
          setProjectComments(emptyComments);
        }
      }
    };
    
    fetchAllComments();
  }, [projects]);

  // Listen for WebSocket events
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = ({ projectId, status }: { projectId: string | number; status: string }) => {
      queryClient.setQueryData<Project[]>(['user-projects'], (old = []) => 
        old.map(project => 
          project.id === projectId 
            ? { ...project, status }
            : project
        )
      );
    };

    const handleNewComment = (comment: Comment) => {
      setProjectComments(prev => ({
        ...prev,
        [comment.projectId]: [comment, ...(prev[comment.projectId] || [])]
      }));
    };

    const handleDeletedComment = ({ id, projectId }: { id: number; projectId: number }) => {
      setProjectComments(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(comment => comment.id !== id)
      }));
    };

    socket.on('project:status-updated', handleStatusUpdate);
    socket.on('comment:created', handleNewComment);
    socket.on('comment:deleted', handleDeletedComment);

    return () => {
      socket.off('project:status-updated', handleStatusUpdate);
      socket.off('comment:created', handleNewComment);
      socket.off('comment:deleted', handleDeletedComment);
    };
  }, [socket, queryClient]);

  const handleStatusChange = (projectId: number|string, status: string) => {
    updateProjectStatus.mutate({ projectId, status });
  };

  const createCommentMutation: UseMutationResult<Comment, unknown, CommentMutationVariables> = useMutation({
    mutationFn: ({ projectId, content }: CommentMutationVariables) => 
      createComment(projectId, content),
    onMutate: async ({ projectId, content }) => {
      if (!user) return;
      
      // Create optimistic comment
      const optimisticComment: Comment = {
        id: -Date.now(), // Temporary negative ID to avoid conflicts
        content,
        projectId,
        userId: Number(user.id),
        user: {
          id: Number(user.id),
          name: user.name || 'Unknown User',
          email: user.email || ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Comment; // Cast to Comment to handle temporary ID
      
      // Update UI optimistically
      setProjectComments(prev => ({
        ...prev,
        [projectId]: [optimisticComment, ...(prev[projectId] || [])]
      }));
      
      // Save for potential rollback
      return { optimisticComment, projectId };
    },
    onSuccess: (data, _variables, context) => {
      if (!context) return;
      
      // Replace optimistic comment with server response
      setProjectComments(prev => ({
        ...prev,
        [context.projectId]: prev[context.projectId].map(comment => 
          comment.id === context.optimisticComment.id ? data : comment
        )
      }));
      
      setCommentText('');
      setCommentingProject(null);
    },
    onError: (error, _variables, context) => {
      if (!context) return;
      
      // Rollback on error
      setProjectComments(prev => ({
        ...prev,
        [context.projectId]: prev[context.projectId].filter(
          comment => comment.id !== context.optimisticComment.id
        )
      }));
      
      // Show error message
      console.error('Failed to post comment:', error);
    }
  });

  // Update comment mutation
  const updateCommentMutation = useMutation<Comment, Error, {commentId: number, content: string}>({
    mutationFn: async ({ commentId, content }) => {
      const response = await api.put(`/comments/${commentId}`, { content });
      return response.data;
    },
    onSuccess: (updatedComment) => {
      setProjectComments(prev => ({
        ...prev,
        [updatedComment.projectId]: (prev[updatedComment.projectId] || []).map(comment => 
          comment.id === updatedComment.id ? updatedComment : comment
        )
      }));
      setEditingComment({id: null, content: ''});
      toast.success('Comment updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update comment:', error);
      toast.error('Failed to update comment');
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation<unknown, Error, number, { projectId: number; commentId: number; previousComments: Comment[] } | null>({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onMutate: async (commentId) => {
      // Find which project this comment belongs to
      const projectId = Object.keys(projectComments).find(projectId => 
        projectComments[parseInt(projectId)].some(comment => comment.id === commentId)
      );
      
      if (!projectId) return null;
      
      // Save the current comments for potential rollback
      const previousComments = projectComments[parseInt(projectId)];
      
      // Optimistically remove the comment
      setProjectComments(prev => ({
        ...prev,
        [projectId]: prev[parseInt(projectId)].filter(comment => comment.id !== commentId)
      }));
      
      // Return the context with the previous comments for rollback
      return { projectId: parseInt(projectId), commentId, previousComments };
    },
    onError: (_error: Error, _commentId: number, context) => {
      if (!context) return;
      
      // Revert back to the previous comments on error
      setProjectComments(prev => ({
        ...prev,
        [context.projectId]: context.previousComments
      }));
      
      console.error('Failed to delete comment:', _error);
      toast.error('Failed to delete comment');
    },
    onSettled: () => {
      // Invalidate and refetch comments to ensure UI is in sync with server
      // This will run after either success or error
      queryClient.invalidateQueries({ queryKey: ['project-comments'] });
    }
  });

  const handleCommentSubmit = async (e: React.FormEvent, projectId: number) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const comment = await createCommentMutation.mutateAsync({
        projectId,
        content: commentText,
      });
      
      // Notify project members about the new comment
      if (currentUser) {
        const project = projects.find(p => p.id === projectId);
        if (project && project.members) {
          try {
            // Get all testers who should be notified (except the comment author)
            const testersToNotify = project.members.filter((member: ProjectMember) => {
              if (member.id === currentUser.id) return false;
              
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

            console.log('Testers to notify:', testersToNotify);

            // Get unique user IDs of testers
            const testerIds = Array.from(new Set(
              testersToNotify.map(member => member.id.toString())
            ));

            console.log('Sending notifications to tester IDs:', testerIds);

            // Send notification to testers
            if (testerIds.length > 0) {
              const notificationData = {
                userIds: testerIds,
                message: `New comment from ${currentUser.name}`,
                type: 'comment',
                link: `/projects/${project.id}`,
                projectId: project.id,
                commentId: comment.id,
                metadata: {
                  commentAuthor: currentUser.name,
                  commentContent: commentText.length > 50 ? 
                    `${commentText.substring(0, 50)}...` : commentText,
                  projectName: project.name,
                  timestamp: new Date().toISOString()
                }
              };
              
              console.log('Sending notification with data:', notificationData);
              const notificationSent = emitNotification(notificationData);
              console.log('Notification send result:', notificationSent ? 'Success' : 'Failed');
              
              if (!notificationSent) {
                console.warn('Failed to send notification for new comment');
              }
            }
          } catch (notificationError) {
            console.error('Error sending notification:', notificationError);
            // Don't fail the comment submission if notification fails
          }
        }
      }
      
      setCommentText('');
      setCommentingProject(null);
      
    } catch (error) {
      console.error('Failed to post comment:', error);
      toast.error('Failed to post comment. Please try again.');
    }
  };

  const handleDeleteComment = async (commentId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteCommentMutation.mutate(commentId);
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
  };

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="w-8 h-8 text-yellow-500" />
        <span className="text-gray-600">Please sign in to view your projects</span>
      </div>
    );
  }

  // Check if token exists
  const token = localStorage.getItem('token');
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <span className="text-gray-600">Authentication token not found. Please sign in again.</span>
      </div>
    );
  }

  // Loading state
  if (isLoadingProjects) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-gray-600">Loading your projects...</span>
      </div>
    );
  }
  
  // Error state
  if (projectsError) {
    return (
      <div className="p-4 bg-red-50 rounded-lg max-w-2xl mx-auto">
        <div className="flex items-start text-red-700">
          <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load your projects</p>
            <p className="text-sm text-red-600 mt-1">
              {projectsError instanceof Error ? projectsError.message : 'An unknown error occurred'}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => refetchProjects()}
          className="mt-3 px-4 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
        >
          Retry
        </Button>
      </div>
    );
  }

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
                  {projectComments[project.id]?.map((comment) => (
                    <div key={comment.id} className="p-4 border-b last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{comment.user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          {editingComment.id === comment.id ? (
                            <div className="mt-2 w-full">
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
