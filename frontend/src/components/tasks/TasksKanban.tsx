import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task, TaskStatus, TaskPriority } from '@/services/task.service';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

// Map statuses to display values
const statusMap = {
  'TODO': { title: 'To Do', color: 'bg-gray-100 text-gray-800' },
  'IN_PROGRESS': { title: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  'IN_REVIEW': { title: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
  'DONE': { title: 'Done', color: 'bg-green-100 text-green-800' },
  'BLOCKED': { title: 'Blocked', color: 'bg-red-100 text-red-800' },
} as const;

const priorityColors = {
  'LOW': 'bg-blue-100 text-blue-800',
  'MEDIUM': 'bg-yellow-100 text-yellow-800',
  'HIGH': 'bg-orange-100 text-orange-800',
  'URGENT': 'bg-red-100 text-red-800',
} as const;

interface TasksKanbanProps {
  tasks: Task[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onTaskClick?: (task: Task) => void;
}

export function TasksKanban({ tasks = [], isLoading = false, onRefresh, onTaskClick }: TasksKanbanProps) {
  // Group tasks by status
  const tasksByStatus = tasks.reduce<Record<TaskStatus, Task[]>>(
    (acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  // Sort tasks by priority within each status
  Object.values(tasksByStatus).forEach(tasks => {
    tasks.sort((a, b) => {
      const priorityOrder = { 'URGENT': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  });

  const handleTaskClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">My Tasks</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-w-[1200px] px-4">
        {(Object.entries(statusMap) as [TaskStatus, { title: string; color: string }][])
          .filter(([status]) => status in tasksByStatus)
          .map(([status, config]) => (
          <div key={status} className="flex flex-col h-full">
            <Card className="h-full flex flex-col">
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${config.color}`}></span>
                  {config.title}
                  <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                    {tasksByStatus[status]?.length || 0}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
                {tasksByStatus[status]?.map((task) => (
                  <Card 
                    key={task.id}
                    className="p-3 mb-3 cursor-pointer hover:bg-muted/50 transition-colors shadow-sm"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-medium text-sm flex-1">{task.title}</h3>
                      <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                        {task.priority.toLowerCase()}
                      </Badge>
                    </div>
                    
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
                      {task.dueDate && (
                        <div className="flex items-center">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {format(new Date(task.dueDate), 'MMM d')}
                        </div>
                      )}
                      {task.project?.name && (
                        <span className="truncate max-w-[120px]">
                          {task.project.name}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
                
                {(!tasksByStatus[status] || tasksByStatus[status]?.length === 0) && (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    No tasks in this status
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
