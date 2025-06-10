import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Notification } from '@/services/notification.service';

type NotificationHandler = (notification: Notification) => void;

type NotificationData = {
  userIds: (string | number)[];
  message: string;
  type: string;
  link?: string;
  projectId?: number | string;
  commentId?: number | string;
  [key: string]: any;
};

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  emitNotification: (data: NotificationData) => boolean;
  subscribeToNotifications: (callback: NotificationHandler) => () => void;
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated, token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const notificationHandlers = useRef<Set<NotificationHandler>>(new Set());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Handle incoming notifications
  const handleNotification = useCallback((notification: Notification) => {
    console.log('📢 [Socket] Received notification:', notification);
    notificationHandlers.current.forEach(handler => {
      try {
        console.log('📢 [Socket] Dispatching to handler');
        handler(notification);
      } catch (error) {
        console.error('Error in notification handler:', error);
      }
    });
  }, []);

  // Subscribe to notifications
  const subscribeToNotifications = useCallback((callback: NotificationHandler) => {
    notificationHandlers.current.add(callback);
    return () => {
      notificationHandlers.current.delete(callback);
    };
  }, []);

  // Emit notification to specific users
  const emitNotification = useCallback((data: NotificationData): boolean => {
    if (!socketRef.current) {
      console.error('Socket not connected, cannot send notification');
      return false;
    }
    
    const notificationData = {
      ...data,
      timestamp: new Date().toISOString(),
      // Ensure userIds is always an array of strings
      userIds: (data.userIds || []).map(id => id.toString())
    };
    
    console.log('📤 [Socket] Emitting notification:', notificationData);
    
    try {
      socketRef.current.emit('send-notification', notificationData);
      return true;
    } catch (error) {
      console.error('Failed to emit notification:', error);
      return false;
    }
  }, []);

  // Set up socket connection when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        console.log('🔌 [Socket] Disconnecting due to missing auth');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const url = new URL(apiUrl);
    const socketUrl = `${url.protocol}//${url.host}`;
    
    console.log(' [Socket] Initializing WebSocket connection to:', socketUrl);

    const socketInstance = io(socketUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      withCredentials: true,
      timeout: 10000,
      forceNew: true,
      query: {
        token,
        userId: user?.id || ''
      },
      extraHeaders: {
        'X-Client-Type': 'web',
        'X-User-Id': user?.id?.toString() || ''
      }
    });

    const onConnect = () => {
      const socketId = socketInstance.id;
      console.log(' [Socket] Connected to WebSocket server with ID:', socketId);
      reconnectAttempts.current = 0;
      
      if (user?.id) {
        const roomName = `user_${user.id}`;
        console.log(` [Socket] Joining user room: ${roomName}`);
        socketInstance.emit('join-room', { room: roomName }, (response: any) => {
          if (response && response.status === 'success') {
            console.log(` [Socket] Successfully joined room: ${roomName}`);
          } else {
            console.error(` [Socket] Failed to join room ${roomName}:`, response?.error || 'Unknown error');
          }
        });
      }
      
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log(' [Socket] Disconnected from WebSocket server');
      setIsConnected(false);
    };

    const onConnectError = (error: Error) => {
      console.error(' [Socket] Connection error:', error);
      reconnectAttempts.current += 1;
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error(` [Socket] Max reconnection attempts (${maxReconnectAttempts}) reached`);
      }
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('connect_error', onConnectError);
    socketInstance.on('notification', handleNotification);

    socketRef.current = socketInstance;
    
    return () => {
      console.log(' [Socket] Cleaning up WebSocket connection');
      if (socketInstance) {
        socketInstance.off('connect', onConnect);
        socketInstance.off('disconnect', onDisconnect);
        socketInstance.off('connect_error', onConnectError);
        socketInstance.off('notification', handleNotification);
        socketInstance.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, token, user?.id, handleNotification]);

  const contextValue = useMemo(() => ({
    socket: socketRef.current,
    isConnected,
    emitNotification,
    subscribeToNotifications
  }), [isConnected, emitNotification, subscribeToNotifications]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
