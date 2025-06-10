import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, User, Task, TaskStatus, TaskPriority } from '@/services/task.service';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, PlusCircle, Pencil, Trash2, ArrowRight, Tag, Clock, UserPlus, UserMinus } from 'lucide-react';

interface TaskActivityLogProps {
  activities: Activity[];
  className?: string;
}

// Helper function to get user initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Helper function to format the activity message
const formatActivityMessage = (activity: Activity) => {
  const user = activity.user as User;
  const task = activity.task as Task;
  const userName = user?.name || 'Unknown User';
  const taskTitle = task?.title || 'a task';
  
  let message = '';
  let icon = null;
  
  switch (activity.type) {
    case 'TASK_CREATED':
      message = `created ${taskTitle}`;
      icon = <PlusCircle className="h-4 w-4 text-green-500" />;
      break;
    case 'TASK_UPDATED':
      message = `updated ${taskTitle}`;
      icon = <Pencil className="h-4 w-4 text-blue-500" />;
      break;
    case 'TASK_DELETED':
      message = `deleted ${taskTitle}`;
      icon = <Trash2 className="h-4 w-4 text-red-500" />;
      break;
    case 'TASK_STATUS_CHANGED':
      message = `changed status of ${taskTitle} from ${activity.meta?.oldStatus} to ${activity.meta?.newStatus}`;
      icon = <ArrowRight className="h-4 w-4 text-yellow-500" />;
      break;
    case 'TASK_PRIORITY_CHANGED':
      message = `changed priority of ${taskTitle} from ${activity.meta?.oldPriority} to ${activity.meta?.newPriority}`;
      icon = <Tag className="h-4 w-4 text-purple-500" />;
      break;
    case 'TASK_DUE_DATE_CHANGED':
      message = `updated due date for ${taskTitle}`;
      icon = <Clock className="h-4 w-4 text-cyan-500" />;
      break;
    case 'TASK_ASSIGNEE_ADDED':
      message = `assigned ${activity.meta?.assigneeName} to ${taskTitle}`;
      icon = <UserPlus className="h-4 w-4 text-green-500" />;
      break;
    case 'TASK_ASSIGNEE_REMOVED':
      message = `unassigned ${activity.meta?.assigneeName} from ${taskTitle}`;
      icon = <UserMinus className="h-4 w-4 text-red-500" />;
      break;
    case 'COMMENT_ADDED':
      message = `commented on ${taskTitle}`;
      icon = <span className="h-2 w-2 rounded-full bg-blue-500" />;
      break;
    default:
      message = `performed an action on ${taskTitle}`;
      icon = <CheckCircle className="h-4 w-4 text-gray-500" />;
  }
  
  return { message, icon };
};

export function TaskActivityLog({ activities, className = '' }: TaskActivityLogProps) {
  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No activities to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-6 p-4">
            {activities.map((activity) => {
              const user = activity.user as User;
              const { message, icon } = formatActivityMessage(activity);
              
              return (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback>
                        {user?.name ? getInitials(user.name) : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="mt-1 flex-1 w-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {user?.name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {icon}
                      </div>
                    </div>
                    <p className="text-sm">
                      {message}
                    </p>
                    
                    {/* Show additional details if available */}
                    {activity.meta && (
                      <div className="mt-1 text-xs text-muted-foreground space-y-1">
                        {activity.meta.oldStatus && activity.meta.newStatus && (
                          <div className="flex items-center gap-1">
                            <span>Status:</span>
                            <Badge variant="outline" className="text-xs">
                              {activity.meta.oldStatus}
                            </Badge>
                            <ArrowRight className="h-3 w-3 mx-1" />
                            <Badge variant="outline" className="text-xs">
                              {activity.meta.newStatus}
                            </Badge>
                          </div>
                        )}
                        
                        {activity.meta.oldPriority && activity.meta.newPriority && (
                          <div className="flex items-center gap-1">
                            <span>Priority:</span>
                            <Badge variant="outline" className="text-xs">
                              {activity.meta.oldPriority}
                            </Badge>
                            <ArrowRight className="h-3 w-3 mx-1" />
                            <Badge variant="outline" className="text-xs">
                              {activity.meta.newPriority}
                            </Badge>
                          </div>
                        )}
                        
                        {activity.comment && (
                          <div className="mt-1 p-2 bg-muted/50 rounded text-foreground">
                            {activity.comment.content}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
