import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task, TaskPriority, TaskStatus } from '@/services/task.service';
import { format } from 'date-fns';
import { CheckCircle, Circle, Clock, AlertCircle, MoreVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';

interface TaskCardProps {
  task: Task;
  onStatusChange?: (status: TaskStatus) => void;
  onDelete?: (id: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  showProject?: boolean;
  className?: string;
}

const priorityColors: Record<TaskPriority, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-yellow-100 text-yellow-800',
  URGENT: 'bg-red-100 text-red-800',
};

export function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  showProject = false,
  className = '',
}: TaskCardProps) {
  const statusIcons = {
    TODO: <Circle className="h-4 w-4 text-gray-400" />,
    IN_PROGRESS: <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
    IN_REVIEW: <AlertCircle className="h-4 w-4 text-yellow-500" />,
    DONE: <CheckCircle className="h-4 w-4 text-green-500" />,
    BLOCKED: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  const statusLabels: Record<TaskStatus, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    IN_REVIEW: 'In Review',
    DONE: 'Done',
    BLOCKED: 'Blocked',
  };

  const priorityLabels: Record<TaskPriority, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    URGENT: 'Urgent',
  };

  return (
    <Card className={cn('shadow-sm hover:shadow-md transition-shadow', className)}>
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium line-clamp-2">
            <Link to={`/project-manager/tasks/${task.id}`} className="hover:underline">
              {task.title}
            </Link>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/project-manager/tasks/${task.id}/edit`} className="cursor-pointer">
                  Edit
                </Link>
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem 
                  className="text-red-600 focus:text-red-600"
                  onClick={() => onDelete(task.id)}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {showProject && task.project && (
          <div className="text-sm text-muted-foreground">
            {task.project.name}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              {statusIcons[task.status]}
              {statusLabels[task.status]}
            </Badge>
            
            <Badge className={cn(priorityColors[task.priority as TaskPriority], 'capitalize')}>
              {priorityLabels[task.priority as TaskPriority]}
            </Badge>
            
            {task.dueDate && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(task.dueDate), 'MMM d, yyyy')}
              </Badge>
            )}
            
            {task.assignee && (
              <Badge variant="outline" className="capitalize">
                {task.assignee.name.split(' ')[0]}
              </Badge>
            )}
          </div>
          
          {(onMoveUp || onMoveDown) && (
            <div className="flex justify-end gap-1 mt-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={onMoveUp}
                disabled={!onMoveUp}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={onMoveDown}
                disabled={!onMoveDown}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
