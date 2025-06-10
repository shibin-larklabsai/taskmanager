import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTaskUpdates } from '@/hooks/useTaskUpdates';

/**
 * Component that listens for real-time task updates when user is authenticated
 */
export function TaskUpdatesListener() {
  const { isAuthenticated } = useAuth();
  
  // This hook will handle all the real-time task updates
  useTaskUpdates();

  // Handle toast notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleToast = (event: any) => {
      const { type, message } = event.detail;
      // You can replace this with your toast implementation
      console.log(`[${type.toUpperCase()}] ${message}`);
      
      // Example with Sonner toast (if you're using it)
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          switch (type) {
            case 'success':
              toast.success(message);
              break;
            case 'error':
              toast.error(message);
              break;
            case 'warning':
              toast.warning(message);
              break;
            case 'info':
            default:
              toast.info(message);
          }
        });
      }
    };

    window.addEventListener('toast', handleToast);
    return () => window.removeEventListener('toast', handleToast);
  }, [isAuthenticated]);

  return null; // This component doesn't render anything
}
