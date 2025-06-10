import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, MessageSquare, Trash2, ArrowLeft, Edit, Save, X } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { getProjectById } from '@/services/project.service';
import { useAuth } from '@/contexts/AuthContext';
import { Comment, createComment, getProjectComments, deleteComment, updateComment } from '@/services/comment.service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


interface CommentMutationVariables {
  projectId: number;
  content: string;
}

interface CreateCommentContext {
  optimisticComment: Comment;
  projectId: number;
}

export function TesterProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [projectComments, setProjectComments] = useState<Record<number, Comment[]>>({});
  const [commentingProject, setCommentingProject] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Fetch project details
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProjectById(Number(projectId)),
    enabled: !!projectId,
  });

  // Fetch comments for the project
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['project-comments', projectId],
    queryFn: () => getProjectComments(Number(projectId)),
    enabled: !!projectId
  });

  // Update comments when they're loaded, ensuring no duplicates
  useEffect(() => {
    if (projectId && comments.length > 0) {
      setProjectComments(prev => {
        const projectIdNum = Number(projectId);
        const currentComments = prev[projectIdNum] || [];
        
        // Keep any optimistic updates that aren't in the server response
        const optimisticComments = currentComments.filter(comment => comment.isOptimistic);
        const serverCommentIds = new Set(comments.map(c => c.id));
        const remainingOptimistic = optimisticComments.filter(
          comment => !serverCommentIds.has(comment.id as any)
        );
        
        // Only update if there are actual changes
        const mergedComments = [...remainingOptimistic, ...comments];
        const hasChanges = 
          mergedComments.length !== currentComments.length ||
          mergedComments.some((comment, index) => 
            currentComments[index]?.id !== comment.id ||
            currentComments[index]?.content !== comment.content
          );
          
        if (!hasChanges) return prev;
        
        return {
          ...prev,
          [projectIdNum]: mergedComments
        };
      });
    }
  }, [comments, projectId]);

  // Mutation for updating a comment
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: number; content: string }) => {
      return updateComment(commentId, content);
    },
    onMutate: async (variables) => {
      const { commentId, content } = variables;
      if (!projectId) return {};
      
      // Optimistically update the comment
      setProjectComments(prev => {
        const currentComments = prev[Number(projectId)] || [];
        return {
          ...prev,
          [Number(projectId)]: currentComments.map(comment => 
            comment.id === commentId 
              ? { ...comment, content, updatedAt: new Date().toISOString() } 
              : comment
          )
        };
      });
      
      return { previousComments: projectComments[Number(projectId)] };
    },
    onError: (_error, _variables, context: any) => {
      // Revert on error
      if (projectId && context?.previousComments) {
        setProjectComments(prev => ({
          ...prev,
          [Number(projectId)]: context.previousComments
        }));
      }
    },
    onSettled: () => {
      setEditingComment(null);
      setEditCommentText('');
    }
  });

  // Mutation for creating a comment
  const createCommentMutation = useMutation<Comment, Error, CommentMutationVariables, CreateCommentContext>({
    mutationFn: ({ projectId, content }) => 
      createComment(projectId, content),
    onMutate: async ({ projectId, content }) => {
      if (!user) throw new Error('User not authenticated');
      
      // Cancel any outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['project-comments', projectId] });
      
      // Create optimistic comment with a unique temporary ID
      const tempId = `temp-${Date.now()}`;
      const optimisticComment: Comment = {
        id: tempId as any, // Temporary ID will be replaced by the server
        content,
        projectId,
        userId: Number(user.id),
        user: {
          id: Number(user.id),
          name: user.name || 'Unknown User',
          email: user.email || ''
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOptimistic: true // Mark as optimistic update
      };
      
      // Update UI optimistically
      setProjectComments(prev => {
        const existingComments = prev[projectId] || [];
        // Don't add if this exact comment already exists
        if (existingComments.some(c => c.isOptimistic && c.content === content)) {
          return prev;
        }
        return {
          ...prev,
          [projectId]: [optimisticComment, ...existingComments]
        };
      });
      
      return { optimisticComment, projectId };
    },
    onSuccess: (data, _variables, context) => {
      if (!context) return;
      
      // Update the optimistic comment with the real data from the server
      setProjectComments(prev => {
        const currentComments = prev[context.projectId] || [];
        return {
          ...prev,
          [context.projectId]: currentComments.map(comment => 
            comment.isOptimistic && comment.content === data.content
              ? { ...data, isOptimistic: false }
              : comment
          )
        };
      });
      
      // Clear the comment input and reset state
      setCommentText('');
      setCommentingProject(null);
      
      // Invalidate and refetch the comments query to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ['project-comments', context.projectId.toString()],
        refetchType: 'active'
      });
    },
    onError: (_err, _variables, context) => {
      if (!context) return;
      
      // Remove the optimistic comment on error
      setProjectComments(prev => ({
        ...prev,
        [context.projectId]: (prev[context.projectId] || []).filter(
          comment => !comment.isOptimistic || comment.content !== context.optimisticComment.content
        )
      }));
    }
  });

  // Mutation for deleting a comment
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onMutate: async (commentId) => {
      if (!projectId) return {};
      
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['project-comments', projectId] });
      
      // Snapshot the previous value
      const previousComments = queryClient.getQueryData<Comment[]>(['project-comments', projectId]) || [];
      
      // Optimistically update the UI
      setProjectComments(prev => ({
        ...prev,
        [Number(projectId)]: prev[Number(projectId)]?.filter(comment => comment.id !== commentId) || []
      }));
      
      return { previousComments };
    },
    onError: (_err, _commentId, context: any) => {
      if (!projectId) return;
      
      // Rollback on error
      if (context?.previousComments) {
        setProjectComments(prev => ({
          ...prev,
          [Number(projectId)]: context.previousComments
        }));
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure our cache is in sync
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['project-comments', projectId] });
      }
    }
  });

  const handleCommentSubmit = async (e: React.FormEvent, projectId: number) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    try {
      await createCommentMutation.mutateAsync({
        projectId,
        content: commentText.trim(),
      });
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteCommentMutation.mutateAsync(Number(commentId)); // Ensure commentId is a number
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment.id as number);
    setEditCommentText(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditCommentText('');
  };

  const handleSaveEdit = async (commentId: number | string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editCommentText.trim()) return;
    
    try {
      await updateCommentMutation.mutateAsync({
        commentId: Number(commentId), // Ensure commentId is a number
        content: editCommentText.trim()
      });
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <div className="flex items-center">
          <Loader2 className="h-8 w-8 mr-2 animate-spin" />
          <span>Failed to load project details</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Not Found </strong>
          <span className="block sm:inline">Project not found.</span>
        </div>
      </div>
    );
  }



  const formatDate = (dateValue?: string | Date | null) => {
    if (!dateValue) return 'Not set';
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const projectIdNum = projectId ? Number(projectId) : 0;
  const currentProjectComments = projectComments[projectIdNum] || [];
  const isCommenting = commentingProject === projectIdNum;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4 -ml-2"
        size="sm"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Projects
      </Button>

      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <CardTitle className="text-xl font-semibold text-foreground truncate">
                  {project.name}
                </CardTitle>
                {project.description && (
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant="outline" className="shrink-0">
                {project.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:px-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Start Date</p>
                <p className="font-medium">{formatDate(project.startDate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">End Date</p>
                <p className="font-medium">{formatDate(project.endDate)}</p>
              </div>
            </div>

            {/* Comments Section */}
            <div className="mt-8 border-t pt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Comments
                </h2>
                {project.status === 'IN_PROGRESS' ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCommentingProject(project.id)}
                    disabled={isCommenting}
                  >
                    Add Comment
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Comments can only be added to projects that are in progress
                  </div>
                )}
              </div>

              {/* Comment Form */}
              {isCommenting && project.status === 'IN_PROGRESS' && (
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <form onSubmit={(e) => handleCommentSubmit(e, project.id)}>
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                        className="min-h-[100px] mb-4"
                        required
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setCommentingProject(null);
                            setCommentText('');
                          }}
                          disabled={createCommentMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={!commentText.trim() || createCommentMutation.isPending}
                        >
                          {createCommentMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            'Post Comment'
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {currentProjectComments.length > 0 ? (
                  <div className="max-h-[400px] overflow-y-auto pr-4">
                    <div className="space-y-4">
                      {currentProjectComments.map((comment) => (
                        <Card key={comment.id} className="relative">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}`} />
                                <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{comment.user.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                    </p>
                                  </div>
                                  {user && comment.user.id === Number(user.id) && (
                                    <div className="flex items-center gap-1">
                                      {editingComment === comment.id ? (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-green-500 hover:text-green-600"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSaveEdit(comment.id, e);
                                            }}
                                            disabled={updateCommentMutation.isPending}
                                          >
                                            {updateCommentMutation.isPending && updateCommentMutation.variables?.commentId === comment.id ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Save className="h-4 w-4" />
                                            )}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCancelEdit();
                                            }}
                                            disabled={updateCommentMutation.isPending}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStartEdit(comment);
                                            }}
                                            disabled={editingComment !== null}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-600"
                                            onClick={(e) => handleDeleteComment(comment.id, e)}
                                            disabled={editingComment !== null || deleteCommentMutation.isPending}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {editingComment === comment.id ? (
                                  <form onSubmit={(e) => handleSaveEdit(comment.id, e)} className="mt-2">
                                    <Textarea
                                      value={editCommentText}
                                      onChange={(e) => setEditCommentText(e.target.value)}
                                      className="min-h-[80px] w-full"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                  </form>
                                ) : (
                                  <p className="mt-2 text-sm whitespace-pre-line">{comment.content}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
