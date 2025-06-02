import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';

// Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Services
import { getTasks } from '@/services/task.service';

// Hooks
// import { useProjectManagerRole } from '@/hooks/use-roles';

// Types
import type { Task } from '@/services/task.service';

interface TaskFiltersState {
  search: string;
  status: string[];
  priority: string[];
  assignee: string[];
  project: string;
}

type ViewMode = 'list' | 'board' | 'timeline';

type TaskWithRequired = Task & {
  id: number;
  title: string;
  status: string;
  priority: string;
  projectId?: number;
  assigneeId?: number;
  description?: string;
  dueDate?: string;
  reporterId?: number;
  createdAt?: string;
  updatedAt?: string;
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  [key: string]: any; // Add index signature to allow additional properties
};

// Simple TaskFilters component with only used props
const TaskFilters = ({
  search,
  onSearchChange,
  onReset
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onReset: () => void;
}) => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Input
        type="text"
        placeholder="Search tasks..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1"
      />
      <Button variant="outline" onClick={onReset}>
        Reset Filters
      </Button>
    </div>
  </div>
);

interface TasksPageProps {
  // Add any props if needed
}

function TasksPage({}: TasksPageProps) {
  // TODO: Implement proper role check
  const isProjectManager = true;

  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Filters state
  const [filters, setFilters] = useState<TaskFiltersState>({
    search: '',
    status: [],
    priority: [],
    assignee: [],
    project: '',
  });

  // Fetch tasks with proper type assertion and error handling
  const { 
    data: tasksData, 
    isLoading, 
    isError,
    error
  } = useQuery<TaskWithRequired[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      try {
        const data = await getTasks();
        console.log('Fetched tasks:', data); // Debug log
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('Error fetching tasks:', err);
        throw err; // Let React Query handle the error
      }
    }
  });

  // Ensure tasks is always an array
  const tasks = Array.isArray(tasksData) ? tasksData : [];

  // Filter tasks based on filters
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    return tasks.filter((task) => {
      // Filter by search term
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Filter by status
      if (filters.status.length > 0 && task.status && !filters.status.includes(task.status)) {
        return false;
      }

      // Filter by priority
      if (filters.priority.length > 0 && task.priority && !filters.priority.includes(task.priority)) {
        return false;
      }

      // Filter by assignee
      if (filters.assignee.length > 0 && task.assigneeId && 
          !filters.assignee.includes(task.assigneeId.toString())) {
        return false;
      }

      // Filter by project
      if (filters.project && task.projectId && task.projectId.toString() !== filters.project) {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // Handle search filter change
  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      search: '',
      status: [],
      priority: [],
      assignee: [],
      project: '',
    });
  };

  // Handle task click
  const handleTaskClick = (task: TaskWithRequired) => {
    // Implement task click logic here
    console.log('Task clicked:', task);
  };

  // Handle edit task
  const handleEditTask = (task: TaskWithRequired) => {
    // Implement edit task logic here
    console.log('Edit task:', task);
  };

  // Handle task delete
  const handleDeleteTask = (taskId: number) => {
    // TODO: Implement delete logic with confirmation
    if (window.confirm('Are you sure you want to delete this task?')) {
      console.log('Deleting task:', taskId);
      // Add actual delete API call here
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading tasks...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-red-500">
            Error loading tasks: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {isProjectManager && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskFilters
            search={filters.search}
            onSearchChange={handleSearchChange}
            onReset={resetFilters}
          />
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex mb-4 border rounded-md w-fit">
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          onClick={() => setViewMode('list')}
          className={`rounded-r-none ${viewMode !== 'list' ? 'bg-transparent hover:bg-muted/50' : ''}`}
        >
          List
        </Button>
        <Button
          variant={viewMode === 'board' ? 'default' : 'ghost'}
          onClick={() => setViewMode('board')}
          className={`rounded-none border-l ${viewMode !== 'board' ? 'bg-transparent hover:bg-muted/50' : ''}`}
        >
          Board
        </Button>
        <Button
          variant={viewMode === 'timeline' ? 'default' : 'ghost'}
          onClick={() => setViewMode('timeline')}
          className={`rounded-l-none border-l ${viewMode !== 'timeline' ? 'bg-transparent hover:bg-muted/50' : ''}`}
        >
          Timeline
        </Button>
      </div>

      {/* Task List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tasks found. Try adjusting your filters or create a new task.
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              <Card 
                key={task.id}
                className="hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleTaskClick(task)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{task.title}</h3>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTask(task);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {task.description || 'No description'}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                    {task.assignee && (
                      <span>Assigned to: {task.assignee.name}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Task Board View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <Card 
              key={task.id}
              className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col"
              onClick={() => handleTaskClick(task)}
            >
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{task.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.status === 'DONE' ? 'bg-green-100 text-green-800' :
                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    task.status === 'TODO' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {String(task.status || '').replace('_', ' ')}
                  </span>
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">
                    {task.description}
                  </p>
                )}
                <div className="mt-auto pt-2 border-t">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                    {task.assignee && (
                      <div className="flex items-center">
                        <span className="mr-2">
                          {task.assignee.name.split(' ').map(n => n[0]).join('')}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                        >
                          <span className="sr-only">Delete</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredTasks.length === 0 && (
            <div className="col-span-3">
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No tasks found. Try adjusting your filters or create a new task.
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Timeline view coming soon</p>
            <p className="text-sm mt-2">This view will show tasks on a timeline when implemented.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TasksPage;
