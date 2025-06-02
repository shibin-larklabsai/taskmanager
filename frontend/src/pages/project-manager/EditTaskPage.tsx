import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { TaskForm } from '@/components/tasks/TaskForm';
import { getTaskById, updateTask, getProjectMembers, type Task } from '@/services/task.service';

export function EditTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch task details
  const { data: task, isLoading, error } = useQuery<Task>({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(Number(taskId)),
    enabled: !!taskId,
  });

  // Fetch project members for assignee dropdown
  const { data: assignees = [] } = useQuery({
    queryKey: ['projectMembers', task?.projectId],
    queryFn: () => getProjectMembers(Number(task?.projectId)),
    enabled: !!task?.projectId,
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: (data: Partial<Task>) => {
      if (!taskId) throw new Error('Task ID is required');
      return updateTask(Number(taskId), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully');
      navigate(`/project-manager/tasks/${taskId}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

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
        <h3 className="text-lg font-medium">Task not found</h3>
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
          Back to task
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Task</CardTitle>
          <CardDescription>Update the task details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm
            initialData={{
              ...task,
              dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
            }}
            onSubmit={async (data) => {
              await updateTaskMutation.mutateAsync({
                ...data,
                dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
              });
            }}
            onCancel={() => navigate(`/project-manager/tasks/${taskId}`)}
            isSubmitting={updateTaskMutation.isPending}
            projectId={task.projectId}
            assignees={assignees}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default EditTaskPage;
