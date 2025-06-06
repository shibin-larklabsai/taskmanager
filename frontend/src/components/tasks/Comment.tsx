import { useState } from 'react';
import { MessageSquare, Edit2, Trash2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Comment as CommentType } from '@/services/comment.service';

interface CommentProps {
  comment: CommentType;
  userId?: number;
  onEdit: (commentId: number, content: string) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
}

export function Comment({ comment, userId, onEdit, onDelete }: CommentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle both string and number user IDs for ownership check
  const isOwner = userId !== undefined && 
    (String(comment.user.id) === String(userId) || 
     Number(comment.user.id) === Number(userId));

  const handleSave = async () => {
    if (!editedContent.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onEdit(comment.id, editedContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await onDelete(comment.id);
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
  };

  return (
    <div className="flex gap-3 p-4 border-b">
      <Avatar className="h-8 w-8 mt-1">
        <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name)}&background=random`} />
        <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.user.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.updatedAt), { addSuffix: true })}
            </span>
          </div>
          
          {isOwner && !isEditing && (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          
          {isEditing && (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(comment.content);
                }}
                disabled={isSubmitting}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-primary"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                <Save className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[80px]"
              disabled={isSubmitting}
            />
          </div>
        ) : (
          <p className="mt-1 text-sm whitespace-pre-line">{comment.content}</p>
        )}
      </div>
    </div>
  );
}
