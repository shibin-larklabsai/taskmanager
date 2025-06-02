import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useMemo, useState } from 'react';
import { Task, TaskStatus } from '@/services/task.service';
import { cn } from '@/lib/utils';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTaskOperations } from '@/hooks/useTaskOperations';

const statusColumns: { id: TaskStatus; title: string }[] = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'IN_REVIEW', title: 'In Review' },
  { id: 'DONE', title: 'Done' },
  { id: 'BLOCKED', title: 'Blocked' },
];

interface TaskBoardProps {
  tasks: Task[];
  projectId?: number;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
  onTaskUpdate?: (task: Task) => void;
  className?: string;
}

export function TaskBoard({
  tasks,
  projectId,
  onTaskClick,
  onAddTask,
  onTaskUpdate,
  className = '',
}: TaskBoardProps) {
  const { reorderTasks: reorderTasksMutation } = useTaskOperations();
  
  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    return tasks.reduce<Record<TaskStatus, Task[]>>(
      (acc, task) => {
        if (!acc[task.status]) {
          acc[task.status] = [];
        }
        acc[task.status].push(task);
        return acc;
      },
      {
        TODO: [],
        IN_PROGRESS: [],
        IN_REVIEW: [],
        DONE: [],
        BLOCKED: [],
      }
    );
  }, [tasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside the list
    if (!destination) return;

    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;
    const taskId = parseInt(draggableId);

    // No change in position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Find the task being moved
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistically update the UI
    const updatedTasks = [...tasks];
    const taskIndex = updatedTasks.findIndex((t) => t.id === taskId);
    
    if (taskIndex !== -1) {
      // Remove from old position
      updatedTasks.splice(taskIndex, 1);
      
      // Add to new position
      const newTask = { ...task, status: destStatus };
      updatedTasks.splice(destination.index, 0, newTask);
      
      // Update parent component
      if (onTaskUpdate) {
        onTaskUpdate(newTask);
      }
      
      // Update order in the database
      try {
        await reorderTasksMutation({
          projectId: projectId || 0, // Provide a default value or handle this case
          status: destStatus,
          tasks: updatedTasks
            .filter((t) => t.status === destStatus)
            .map((t, index) => ({
              id: t.id,
              order: index,
            })),
        });
      } catch (error) {
        console.error('Failed to reorder tasks:', error);
        // Revert the UI if the API call fails
        if (onTaskUpdate) {
          onTaskUpdate(task);
        }
      }
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
        {statusColumns.map((column) => (
          <div key={column.id} className="flex-1 min-w-[280px] max-w-[350px]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <span
                  className={cn('w-3 h-3 rounded-full', {
                    'bg-gray-400': column.id === 'TODO',
                    'bg-blue-500': column.id === 'IN_PROGRESS',
                    'bg-yellow-500': column.id === 'IN_REVIEW',
                    'bg-green-500': column.id === 'DONE',
                    'bg-red-500': column.id === 'BLOCKED',
                  })}
                />
                {column.title}
                <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5">
                  {tasksByStatus[column.id]?.length || 0}
                </span>
              </h3>
              {onAddTask && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onAddTask(column.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'space-y-3 p-2 rounded-lg min-h-[100px] transition-colors',
                    snapshot.isDraggingOver
                      ? 'bg-gray-100 dark:bg-gray-800/50'
                      : 'bg-gray-50 dark:bg-gray-900/50'
                  )}
                >
                  {tasksByStatus[column.id]?.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id.toString()}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={cn(
                            'mb-3',
                            snapshot.isDragging ? 'opacity-80' : 'opacity-100'
                          )}
                        >
                          <TaskCard
                            task={task}
                            onTaskClick={onTaskClick}
                            className={cn(
                              'w-full',
                              onTaskClick && 'cursor-pointer hover:border-primary'
                            )}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {tasksByStatus[column.id]?.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      No tasks
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
