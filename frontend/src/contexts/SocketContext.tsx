import { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  const { isAuthenticated, token } = useAuth();
  const isConnected = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        isConnected.current = false;
      }
      return;
    }

    // Only create socket if it doesn't exist
    if (!socketRef.current) {
      // Get the base URL without the /api path for WebSocket
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const wsUrl = apiBaseUrl.replace(/\/api$/, ''); // Remove /api if present
      
      const socket = io(wsUrl, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        withCredentials: true,
      });

      socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        isConnected.current = true;
      });

      socket.on('disconnect', (reason) => {
        console.log('Disconnected from WebSocket server:', reason);
        isConnected.current = false;
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });

      socketRef.current = socket;
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        isConnected.current = false;
      }
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected: isConnected.current,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
