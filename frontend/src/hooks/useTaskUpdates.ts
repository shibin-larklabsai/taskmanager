import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/contexts/SocketContext';

export const useTaskUpdates = () => {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTaskUpdated = (updatedTask: any) => {
      // Invalidate and refetch tasks query
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // If we have a specific task query, invalidate that too
      queryClient.invalidateQueries({ queryKey: ['task', updatedTask.id] });
      
      // Show a toast notification
      const event = new CustomEvent('toast', {
        detail: {
          type: 'success',
          message: `Task "${updatedTask.title}" was updated`,
        },
      });
      window.dispatchEvent(event);
    };

    const handleTaskCreated = (newTask: any) => {
      // Invalidate tasks list
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Show a toast notification
      const event = new CustomEvent('toast', {
        detail: {
          type: 'info',
          message: `New task created: "${newTask.title}"`,
        },
      });
      window.dispatchEvent(event);
    };

    const handleTaskDeleted = (deletedTask: any) => {
      // Invalidate tasks list
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Show a toast notification
      const event = new CustomEvent('toast', {
        detail: {
          type: 'warning',
          message: `Task "${deletedTask.title}" was deleted`,
        },
      });
      window.dispatchEvent(event);
    };

    // Subscribe to task events
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:created', handleTaskCreated);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      // Clean up event listeners
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [socket, isConnected, queryClient]);

  return null; // This hook doesn't render anything
};
