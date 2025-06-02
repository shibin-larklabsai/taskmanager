import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getTaskById, updateTask, deleteTask, type Task } from '@/services/task.service';
import { Loader2, ArrowLeft, Edit, Trash2, CheckCircle, Circle, AlertCircle, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

// Extend Task type to include optional properties
interface ExtendedTask extends Omit<Task, 'assignee' | 'project'> {
  estimatedHours?: number;
  actualHours?: number;
  project?: {
    id: number;
    name: string;
  };
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
}

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch task details
  const { data: task, isLoading, error } = useQuery<ExtendedTask>({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(Number(taskId)),
    enabled: !!taskId,
  });

  // Update task status
  const updateStatusMutation = useMutation({
    mutationFn: (status: Task['status']) => {
      if (!taskId) throw new Error('Task ID is required');
      return updateTask(Number(taskId), { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  // Delete task
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!taskId) throw new Error('Task ID is required');
      return await deleteTask(Number(taskId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully');
      navigate('/project-manager/tasks');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'IN_PROGRESS':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'BLOCKED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityBadge = (priority: string = '') => {
    const priorityMap: Record<string, string> = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-yellow-100 text-yellow-800',
      URGENT: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={priorityMap[priority] || 'bg-gray-100 text-gray-800'}>
        {priority.charAt(0) + priority.slice(1).toLowerCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-medium">Task not found</h3>
        <p className="mt-2 text-muted-foreground">The requested task could not be found.</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/project-manager/tasks/${taskId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{task.title}</CardTitle>
                  <CardDescription>
                    Created on {format(new Date(task.createdAt), 'MMM d, yyyy')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(task.status)}
                  <span className="capitalize">{task.status.toLowerCase().replace('_', ' ')}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {task.description ? (
                  <p className="whitespace-pre-line">{task.description}</p>
                ) : (
                  <p className="text-muted-foreground italic">No description provided.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Task created</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(task.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                {task.updatedAt !== task.createdAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                    <div>
                      <p className="text-sm font-medium">Task updated</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(task.updatedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                <div className="flex gap-2 mt-1">
                  <Select
                    value={task.status}
                    onValueChange={(value) => updateStatusMutation.mutate(value as Task['status'])}
                    disabled={updateStatusMutation.isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'].map((status) => (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(status)}
                            <span>{status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Priority</h4>
                <div className="mt-1">{getPriorityBadge(task.priority)}</div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Due Date</h4>
                <div className="mt-1 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Assignee</h4>
                <div className="mt-1 flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>
                      {task.assignee?.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span>{task.assignee?.name || 'Unassigned'}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Project</h4>
                <div className="mt-1">{task.project?.name || 'No project'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated</span>
                    <span>{task.estimatedHours || 0}h</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${Math.min(100, ((task.actualHours || 0) / (task.estimatedHours || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Logged</span>
                    <span>{task.actualHours || 0}h</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
