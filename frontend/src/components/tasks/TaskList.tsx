import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Task, TaskStatus, TaskPriority } from '@/services/task.service';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectManagerRole } from '@/hooks/useProjectManagerRole';

export interface TaskListProps {
  projectId?: number;
  showProject?: boolean;
  showActions?: boolean;
  statusFilter?: TaskStatus;
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (taskId: number, status: TaskStatus) => void;
  onDelete?: (taskId: number) => void;
  onReorder?: (tasks: Task[]) => void;
  className?: string;
}

export function TaskList({
  projectId,
  showProject = false,
  showActions = true,
  statusFilter,
  onTaskClick,
  onStatusChange,
  onDelete,
  onReorder,
  className = '',
}: TaskListProps) {
  const { isProjectManager } = useProjectManagerRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'ALL'>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch tasks with filters
  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ['tasks', { projectId, status: statusFilter, searchQuery, priority: priorityFilter }],
    queryFn: async () => {
      // This would be replaced with an actual API call
      // const response = await getTasks({ projectId, status: statusFilter, searchQuery, priority: priorityFilter });
      // return response.data;
      return [];
    },
  });

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter((task: Task) => {
      if (statusFilter && task.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'ALL' && task.assignee?.id !== assigneeFilter) return false;
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a: Task, b: Task) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'dueDate':
          comparison = (new Date(a.dueDate || 0).getTime()) - (new Date(b.dueDate || 0).getTime());
          break;
        case 'priority':
          const priorityOrder: Record<TaskPriority, number> = {
            URGENT: 0,
            HIGH: 1,
            MEDIUM: 2,
            LOW: 3,
          };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleStatusChange = (taskId: number, newStatus: TaskStatus) => {
    if (onStatusChange) {
      onStatusChange(taskId, newStatus);
    }
  };

  const handleDelete = (taskId: number) => {
    if (onDelete) {
      onDelete(taskId);
    }
  };

  const handleMoveTask = (taskId: string, direction: 'up' | 'down') => {
    if (!onReorder) return;
    
    const taskIndex = tasks.findIndex((t: Task) => t.id === taskId);
    if (taskIndex === -1) return;
    
    const newTasks = [...tasks];
    const newTask = { ...newTasks[taskIndex] };
    
    if (direction === 'up' && taskIndex > 0) {
      // Swap with previous task
      newTasks[taskIndex] = newTasks[taskIndex - 1];
      newTasks[taskIndex - 1] = newTask;
      onReorder(newTasks);
    } else if (direction === 'down' && taskIndex < tasks.length - 1) {
      // Swap with next task
      newTasks[taskIndex] = newTasks[taskIndex + 1];
      newTasks[taskIndex + 1] = newTask;
      onReorder(newTasks);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-8 text-red-500">
        Failed to load tasks. Please try again later.
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search tasks..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Select
            value={priorityFilter}
            onValueChange={(value: TaskPriority | 'ALL') => setPriorityFilter(value)}
          >
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={sortBy}
            onValueChange={(value: 'dueDate' | 'priority' | 'title') => setSortBy(value)}
          >
            <SelectTrigger className="w-[150px]">
              <span className="mr-2">Sort by:</span>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
          >
            {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
          </Button>
        </div>
      </div>
      
      {filteredTasks.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">
          No tasks found. {isProjectManager && (
            <Button variant="link" className="p-0 h-auto">
              Create a new task
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map((task: Task) => (
            <TaskCard
              key={task.id}
              task={task}
              showProject={showProject}
              onStatusChange={onStatusChange ? () => handleStatusChange(task.id, task.status) : undefined}
              onDelete={onDelete ? () => handleDelete(task.id) : undefined}
              onMoveUp={onReorder ? () => handleMoveTask(task.id, 'up') : undefined}
              onMoveDown={onReorder ? () => handleMoveTask(task.id, 'down') : undefined}
              className={onTaskClick ? 'cursor-pointer hover:border-primary' : ''}
              onClick={onTaskClick ? () => onTaskClick(task) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
