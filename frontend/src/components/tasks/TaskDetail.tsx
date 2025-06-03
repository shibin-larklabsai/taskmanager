import React from 'react';
import { X, Clock, Calendar, AlertCircle, CheckCircle, Circle, Clock4 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  
  const handleStatusChange = (newStatus: TaskStatus) => {
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
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
        </CardContent>
      </Card>
    </div>
  );
}
