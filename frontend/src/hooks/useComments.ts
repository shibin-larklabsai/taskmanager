import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createComment, updateComment, deleteComment } from '@/services/comment.service';
import type { Comment as CommentType } from '@/services/comment.service';
import { toast } from 'sonner';

type ProjectComments = Record<number, CommentType[]>;

interface UseCommentsProps {
  initialComments?: ProjectComments;
  onCommentCreated?: (comment: CommentType) => void;
  onCommentUpdated?: (comment: CommentType) => void;
  onCommentDeleted?: (commentId: number | string) => void;
  user?: {
    id: string | number;
    name?: string | null;
    email?: string | null;
  } | null;
}

export const useComments = ({
  initialComments = {},
  onCommentCreated,
  onCommentUpdated,
  onCommentDeleted
}: UseCommentsProps = {}) => {
  const [commentText, setCommentText] = useState('');
  const [commentingProject, setCommentingProject] = useState<number | null>(null);
  const [projectComments, setProjectComments] = useState<ProjectComments>(initialComments);
  const [editingComment, setEditingComment] = useState<{id: string | number | null, content: string}>({id: null, content: ''});
  const pendingCommentIds = useRef<Set<string>>(new Set());

  // Track pending comment operations to prevent duplicates
  const addPendingCommentId = useCallback((id: string) => {
    pendingCommentIds.current.add(id);
  }, []);
  
  const removePendingCommentId = useCallback((id: string) => {
    pendingCommentIds.current.delete(id);
  }, []);
  
  const isPendingComment = useCallback((id: string | number): boolean => {
    return typeof id === 'string' && pendingCommentIds.current.has(id);
  }, []);

  // Handle new comment from WebSocket
  const handleNewComment = useCallback((comment: CommentType) => {
    // Skip if this is a pending optimistic comment
    if (isPendingComment(comment.id.toString())) {
      removePendingCommentId(comment.id.toString());
      return;
    }
    
    setProjectComments(prev => {
      const existingComments = prev[comment.projectId] || [];
      
      // Check if comment already exists to prevent duplicates
      const isDuplicate = existingComments.some(c => 
        c.id === comment.id || 
        (c.isOptimistic && 
         c.content === comment.content && 
         c.userId === comment.userId && 
         Math.abs(new Date(c.createdAt).getTime() - new Date(comment.createdAt).getTime()) < 10000)
      );
      
      if (isDuplicate) {
        return prev;
      }
      
      // Update the comments list with the new comment
      return {
        ...prev,
        [comment.projectId]: [comment, ...existingComments]
      };
    });
  }, [isPendingComment, removePendingCommentId]);

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async ({ projectId, content }: { projectId: number; content: string }) => 
      createComment(projectId, content),
    onMutate: async (variables: { projectId: number; content: string }, context: any) => {
      const { projectId, content } = variables;
      const user = props?.user;
      if (!user) return null;
      
      const tempId = `temp-${Date.now()}`;
      const optimisticComment: CommentType = {
        id: tempId,
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
        isOptimistic: true
      };
      
      // Track this optimistic comment
      addPendingCommentId(tempId);
      
      // Optimistic update
      setProjectComments(prev => ({
        ...prev,
        [projectId]: [optimisticComment, ...(prev[projectId] || [])]
      }));
      
      return { optimisticComment, projectId };
    },
    onSuccess: (data, _variables, context) => {
      if (!context) return;
      
      // Replace optimistic comment with server response
      setProjectComments(prev => {
        const existingComments = prev[context.projectId] || [];
        
        // If the optimistic comment is still there, replace it
        if (existingComments.some(c => c.id === context.optimisticComment.id)) {
          return {
            ...prev,
            [context.projectId]: existingComments.map(comment => 
              comment.id === context.optimisticComment.id ? data : comment
            )
          };
        }
        
        // Otherwise, just add the new comment
        return {
          ...prev,
          [context.projectId]: [data, ...existingComments]
        };
      });
      
      setCommentText('');
      setCommentingProject(null);
      
      // Clean up
      removePendingCommentId(context.optimisticComment.id);
      
      // Notify parent component
      onCommentCreated?.(data);
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      
      // Remove optimistic comment on error
      setProjectComments(prev => ({
        ...prev,
        [context.projectId]: (prev[context.projectId] || []).filter(
          comment => comment.id !== context.optimisticComment.id
        )
      }));
      
      // Clean up
      removePendingCommentId(context.optimisticComment.id);
      
      toast.error('Failed to post comment');
    }
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) => 
      updateComment(commentId, content),
    onMutate: async ({ commentId, content }) => {
      // Find the comment being updated
      const projectId = Object.keys(projectComments).find(pid => 
        projectComments[parseInt(pid)].some(comment => comment.id === commentId)
      );
      
      if (!projectId) return null;
      
      const previousComments = projectComments[parseInt(projectId)] || [];
      const commentToUpdate = previousComments.find(c => c.id === commentId);
      
      if (!commentToUpdate) return null;
      
      // Optimistic update
      setProjectComments(prev => ({
        ...prev,
        [projectId]: previousComments.map(comment => 
          comment.id === commentId 
            ? { ...comment, content, updatedAt: new Date().toISOString() } 
            : comment
        )
      }));
      
      return { previousComments, projectId, commentId };
    },
    onSuccess: (updatedComment) => {
      // The optimistic update already updated the UI, just ensure data is in sync
      setProjectComments(prev => {
        const projectId = updatedComment.projectId;
        const existingComments = prev[projectId] || [];
        
        return {
          ...prev,
          [projectId]: existingComments.map(comment => 
            comment.id === updatedComment.id 
              ? { ...updatedComment, user: comment.user } 
              : comment
          )
        };
      });
      
      setEditingComment({ id: null, content: '' });
      toast.success('Comment updated successfully');
      
      // Notify parent component
      onCommentUpdated?.(updatedComment);
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      
      // Revert to previous state on error
      setProjectComments(prev => ({
        ...prev,
        [context.projectId]: context.previousComments
      }));
      
      console.error('Failed to update comment');
      toast.error('Failed to update comment');
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onMutate: async (commentId) => {
      // Find which project this comment belongs to
      const projectId = Object.keys(projectComments).find(pid => 
        projectComments[parseInt(pid)].some(comment => comment.id === commentId)
      );
      
      if (!projectId) return null;
      
      const previousComments = projectComments[parseInt(projectId)] || [];
      const commentToDelete = previousComments.find(c => c.id === commentId);
      
      if (!commentToDelete) return null;
      
      // Optimistic update
      setProjectComments(prev => ({
        ...prev,
        [projectId]: previousComments.filter(comment => comment.id !== commentId)
      }));
      
      return { previousComments, projectId, commentId };
    },
    onSuccess: (_data, commentId, context) => {
      if (!context) return;
      
      // The optimistic update already removed the comment, just show success
      toast.success('Comment deleted successfully');
      
      // Notify parent component
      onCommentDeleted?.(commentId);
    },
    onError: (_error, _commentId, context) => {
      if (!context) return;
      
      // Revert to previous state on error
      setProjectComments(prev => ({
        ...prev,
        [context.projectId]: context.previousComments
      }));
      
      console.error('Failed to delete comment');
      toast.error('Failed to delete comment');
    }
  });

  // Handle comment submission
  const handleCommentSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentingProject || !commentText.trim()) return;
    
    try {
      await createCommentMutation.mutateAsync({
        projectId: commentingProject,
        content: commentText
      });
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  }, [commentText, commentingProject, createCommentMutation]);

  // Handle starting to edit a comment
  const handleStartEditing = useCallback((comment: CommentType) => {
    setEditingComment({ id: comment.id, content: comment.content });
  }, []);

  // Handle saving an edited comment
  const handleSaveEdit = useCallback(async (projectId: number) => {
    if (!editingComment.id || !editingComment.content.trim()) return;
    
    // Only make API call if it's not a temporary ID
    if (typeof editingComment.id === 'string' && editingComment.id.startsWith('temp-')) {
      toast.error('Please wait for the comment to be saved before editing');
      return;
    }
    
    try {
      await updateCommentMutation.mutateAsync({
        commentId: Number(editingComment.id),
        content: editingComment.content
      });
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  }, [editingComment, updateCommentMutation]);

  // Handle comment deletion
  const handleDeleteComment = useCallback(async (commentId: string | number, projectId: number) => {
    if (typeof commentId === 'string' && commentId.startsWith('temp-')) {
      // For optimistic comments, just remove them from the UI
      setProjectComments(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(c => c.id !== commentId)
      }));
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteCommentMutation.mutateAsync(Number(commentId));
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
  }, [deleteCommentMutation]);

  return {
    // State
    commentText,
    setCommentText,
    commentingProject,
    setCommentingProject,
    projectComments,
    setProjectComments,
    editingComment,
    setEditingComment,
    
    // Handlers
    handleNewComment,
    handleCommentSubmit,
    handleStartEditing,
    handleSaveEdit,
    handleDeleteComment,
    
    // Utils
    isPendingComment,
    
    // Mutations (exposed for external access if needed)
    createComment: createCommentMutation.mutateAsync,
    updateComment: updateCommentMutation.mutateAsync,
    deleteComment: deleteCommentMutation.mutateAsync
  };
};
