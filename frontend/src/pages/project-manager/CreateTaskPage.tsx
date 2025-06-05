import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { TaskForm } from '@/components/tasks/TaskForm';
import { createTask, getProjectMembers, type CreateTaskData } from '@/services/task.service';

export function CreateTaskPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch project members for assignee dropdown
  const { data: assignees = [] } = useQuery({
    queryKey: ['projectMembers'],
    queryFn: () => getProjectMembers(1), // Default to first project for demo
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskData) => {
      console.log('Creating task with data:', data);
      return createTask(data);
    },
    onSuccess: (newTask) => {
      console.log('Task created successfully, navigating to task');
      toast.success('Task created successfully', {
        onAutoClose: () => {
          navigate(`/project-manager/tasks/${newTask.id}`);
        },
      });
    },
    onError: (error: Error) => {
      console.error('Error creating task:', error);
      toast.error(`Failed to create task: ${error.message}`, {
        duration: 5000 // 5 seconds for errors
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Task</CardTitle>
          <CardDescription>Fill in the details below to create a new task.</CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm
            onSubmit={async (data) => {
              await createTaskMutation.mutateAsync({
                ...data,
                dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
                projectId: 1, // Default to first project for demo
              });
            }}
            onCancel={() => navigate('/project-manager/tasks')}
            isSubmitting={createTaskMutation.isPending}
            projectId={1} // Default to first project for demo
            assignees={assignees}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateTaskPage;
