import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { Loader2, AlertCircle, Calendar, Folder, MessageSquare, Trash2 } from 'lucide-react';
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
import { Comment, createComment, getProjectComments, deleteComment } from '@/services/comment.service';
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

type User = {
  id: number | string;
  name: string;
  email: string;
  roles?: UserRole[];
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const updateProjectStatus = useUpdateProjectStatus();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

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

  // Fetch comments for all projects
  useEffect(() => {
    const fetchComments = async () => {
      if (projects?.length) {
        const commentsMap: Record<number, Comment[]> = {};
        
        for (const project of projects) {
          try {
            const comments = await getProjectComments(project.id);
            commentsMap[project.id] = comments;
          } catch (error) {
            console.error(`Failed to fetch comments for project ${project.id}:`, error);
            commentsMap[project.id] = [];
          }
        }
        
        setProjectComments(commentsMap);
      }
    };
    
    fetchComments();
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

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
  });

  const handleCommentSubmit = async (e: React.FormEvent, projectId: number) => {
    e.preventDefault();
    if (!commentText.trim() || !commentingProject) return;
    
    try {
      await createCommentMutation.mutate({
        projectId,
        content: commentText.trim(),
      });
    } catch (error) {
      console.error('Failed to post comment:', error);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            {projects?.length || 0} {(projects?.length || 0) === 1 ? 'project' : 'projects'} you have access to
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
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
                          <p className="mt-1 text-sm">{comment.content}</p>
                        </div>
                        {(String(user?.id) === String(comment.user.id) || 
                        user?.roles?.some((role: UserRole) => 
                          ['admin', 'project_manager'].includes(role?.name || '')
                        )) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => handleDeleteComment(comment.id, e)}
                            disabled={deleteCommentMutation.status === 'pending'}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
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
