import { format, isToday, isYesterday, isTomorrow, isSameDay, addDays } from 'date-fns';
import { Task } from '@/services/task.service';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskTimelineProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  className?: string;
  daysToShow?: number;
}

export function TaskTimeline({
  tasks,
  onTaskClick,
  className = '',
  daysToShow = 7,
}: TaskTimelineProps) {
  const today = new Date();
  
  // Generate array of dates to show in the timeline
  const dates = Array.from({ length: daysToShow }, (_, i) => {
    return addDays(today, i - Math.floor(daysToShow / 2));
  });

  // Group tasks by date
  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!task.dueDate) return acc;
    
    const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(task);
    return acc;
  }, {});

  // Get status icon for task
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'IN_PROGRESS':
      case 'IN_REVIEW':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'BLOCKED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get date label
  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  // Check if a date has any tasks
  const hasTasks = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return tasksByDate[dateKey]?.length > 0;
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Upcoming Tasks</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Week
          </Button>
          <Button variant="outline" size="sm">
            Month
          </Button>
        </div>
      </div>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800" />
        
        <div className="space-y-8">
          {dates.map((date, dateIndex) => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const dateTasks = tasksByDate[dateKey] || [];
            const isDateInPast = date < today && !isToday(date);
            
            return (
              <div key={dateKey} className="relative">
                {/* Date dot */}
                <div
                  className={cn(
                    'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center z-10',
                    isToday(date)
                      ? 'bg-primary text-primary-foreground'
                      : isDateInPast
                      ? 'bg-gray-200 dark:bg-gray-700'
                      : 'bg-blue-100 dark:bg-blue-900/50',
                    hasTasks(date) && 'ring-2 ring-offset-2 ring-offset-background',
                    isToday(date) ? 'ring-primary' : 'ring-blue-500'
                  )}
                >
                  <span className="text-xs font-medium">
                    {format(date, 'd')}
                  </span>
                </div>
                
                <div className="pl-12">
                  <div className="flex items-center mb-2">
                    <h4
                      className={cn(
                        'text-sm font-medium',
                        isToday(date)
                          ? 'text-primary'
                          : isDateInPast
                          ? 'text-muted-foreground'
                          : 'text-foreground'
                      )}
                    >
                      {getDateLabel(date)}
                    </h4>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {format(date, 'MMMM yyyy')}
                    </span>
                  </div>
                  
                  {dateTasks.length > 0 ? (
                    <div className="space-y-2">
                      {dateTasks.map((task) => (
                        <TooltipProvider key={task.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer',
                                  task.status === 'DONE' && 'opacity-70',
                                  isDateInPast && task.status !== 'DONE' && 'border-red-200 dark:border-red-900/50'
                                )}
                                onClick={() => onTaskClick?.(task)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(task.status)}
                                    <span className="font-medium line-clamp-1">
                                      {task.title}
                                    </span>
                                  </div>
                                  <Badge
                                    variant={task.priority === 'URGENT' ? 'destructive' : 'outline'}
                                    className="text-xs"
                                  >
                                    {task.priority}
                                  </Badge>
                                </div>
                                {task.project && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {task.project.name}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]" side="right">
                              <div className="space-y-1">
                                <h4 className="font-medium">{task.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {task.description || 'No description'}
                                </p>
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                                  <Badge variant="outline" className="text-xs">
                                    {task.status.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {task.priority}
                                  </Badge>
                                  {task.dueDate && (
                                    <span className="text-xs text-muted-foreground">
                                      Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-2">
                      No tasks scheduled
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
