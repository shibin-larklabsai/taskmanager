import React, { useState } from 'react';
import { X, Clock, Calendar, AlertCircle, CheckCircle, Circle, Clock4, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjectComments, createComment, updateComment, deleteComment, Comment } from '@/services/comment.service';
import { useAuth } from '@/contexts/AuthContext';
import { Comment as CommentComponent } from './Comment';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface TaskDetailProps {
  task: {
    id: number;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string | Date | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    projectId: number;
    project?: {
      id: number;
      name: string;
    } | null;
  };
  onClose: () => void;
  onStatusChange?: (status: TaskStatus) => void;
}

export function TaskDetail({ task, onClose, onStatusChange }: TaskDetailProps) {
  const statusOptions = [
    { value: 'TODO', label: 'To Do', icon: <Circle className="h-4 w-4 text-gray-400" /> },
    { value: 'IN_PROGRESS', label: 'In Progress', icon: <Clock4 className="h-4 w-4 text-blue-500" /> },
    { value: 'IN_REVIEW', label: 'In Review', icon: <AlertCircle className="h-4 w-4 text-yellow-500" /> },
    { value: 'DONE', label: 'Done', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
    { value: 'BLOCKED', label: 'Blocked', icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
  ];

  const currentStatus = statusOptions.find(option => option.value === task.status) || statusOptions[0];
  
  const handleStatusChange = async (status: TaskStatus) => {
    if (!task) return;
    
    try {
      // await updateStatusMutation.mutateAsync({
      //   taskId: task.id,
      //   status,
      // });
      // setSelectedTask((prev: Task | null) => prev ? { ...prev, status } : null);
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  // Comments functionality
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');

  // Fetch comments for the task's project with loading state
  const { 
    data: comments = [], 
    isLoading: isLoadingComments
  } = useQuery<Comment[]>({
    queryKey: ['task-comments', task.projectId],
    queryFn: () => getProjectComments(task.projectId),
    enabled: !!task.projectId,
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    staleTime: 5 * 60 * 1000, // 5 minutes until data is considered stale
  });

  // Create new comment mutation
  const createCommentMutation = useMutation({
    mutationFn: (content: string) => 
      createComment(task.projectId, content),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.projectId] });
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: number; content: string }) => 
      updateComment(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.projectId] });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => 
      deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.projectId] });
    },
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment);
  };

  const priorityColors = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'Not set';
    return format(new Date(date), 'MMM d, yyyy');
  };

  // Close modal when clicking on the backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Close modal on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <Card 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in fade-in-75"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b">
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl">{task.title}</CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Select
              value={task.status}
              onValueChange={(value) => handleStatusChange(value as TaskStatus)}
            >
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                  {currentStatus.icon}
                  <SelectValue placeholder="Select status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="flex items-center gap-1">
              {currentStatus.icon}
              {currentStatus.label}
            </Badge>
            <Badge className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
            {task.project && (
              <Badge variant="secondary">
                {task.project.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4" />
                <span>Created</span>
              </div>
              <p>{formatDate(task.createdAt)}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                <span>Due Date</span>
              </div>
              <p>{formatDate(task.dueDate)}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-2 h-4 w-4" />
                <span>Last Updated</span>
              </div>
              <p>{formatDate(task.updatedAt)}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Description</h3>
            <div className="prose max-w-none">
              {task.description ? (
                <p className="whitespace-pre-line">{task.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description provided.</p>
              )}
            </div>
          </div>
          
          {onStatusChange && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Update Status</h4>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(statusOptions) as TaskStatus[]).map((status) => (
                  <Button
                    key={status}
                    variant={task.status === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onStatusChange(status)}
                  >
                    <div className="flex items-center gap-2">
                      {statusOptions.find(option => option.value === status)?.icon}
                      <span>{statusOptions.find(option => option.value === status)?.label}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Comments Section */}
          <div className="pt-6 border-t mt-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">Comments</h3>
              <span className="text-sm text-muted-foreground">
                ({comments.length} {comments.length === 1 ? 'comment' : 'comments'})
              </span>
            </div>
            
            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px] flex-1"
                  disabled={createCommentMutation.isPending}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="self-end h-10 w-10"
                  disabled={!newComment.trim() || createCommentMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
            
            {/* Comments List */}
            <div className="space-y-4">
              {isLoadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (Array.isArray(comments) && comments.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                (Array.isArray(comments) ? comments : []).map((comment: Comment) => (
                  <CommentComponent
                    key={comment.id}
                    comment={comment}
                    userId={user?.id}
                    onEdit={async (commentId, content) => {
                      await updateCommentMutation.mutateAsync({ commentId, content });
                    }}
                    onDelete={async (commentId) => {
                      await deleteCommentMutation.mutateAsync(commentId);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
