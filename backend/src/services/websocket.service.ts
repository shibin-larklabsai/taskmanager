import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { redis, redisSubscriber } from '../config/redis.js';
import User from '../models/user.model.js';

class WebSocketService {
  private io: Server | null = null;
  private static instance: WebSocketService;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public async initialize(server: HttpServer): Promise<void> {
    if (this.io) {
      // Already initialized
      return;
    }
    // Create Socket.IO server
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL?.split(',') || [
          'http://localhost:5173',
          'http://localhost:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:3000'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
        allowedHeaders: ['Authorization', 'Content-Type']
      },
      allowEIO3: true,
      transports: ['websocket', 'polling']
    });

    // Use existing Redis clients for pub/sub
    this.io.adapter(createAdapter(
      redis.duplicate(),
      redisSubscriber.duplicate()
    ));

    // Middleware for authentication
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || 
                   socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: number };
        
        // Get user from database with roles
        const { default: Role } = await import('../models/role.model.js');
        const user = await User.findByPk(decoded.id, {
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: Role,
              as: 'roles',
              through: { attributes: [] },
              attributes: ['name']
            }
          ]
        });

        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }
        
        // Extract role names safely
        const userRoles = (user as any).roles?.map((role: any) => role.name) || [];
        
        // Attach user to socket for later use
        socket.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: userRoles
        };

        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // Handle connection
    this.io.on('connection', (socket: any) => {
      console.log(`User ${socket.user?.id} connected`);
      
      // Join user to their own room for private messages
      socket.join(`user_${socket.user.id}`);
      
      // Join user to admin room if they are an admin
      const userRoles = socket.user?.roles || [];
      if (userRoles.includes('admin') || userRoles.includes('ADMIN')) {
        socket.join('admin');
      }

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.user?.id} disconnected`);
      });

      // Handle task events
      this.setupTaskHandlers(socket);
    });

    console.log('WebSocket server initialized');
  }

  private setupTaskHandlers(socket: any): void {
    // Listen for task creation
    socket.on('task:create', async (task: any) => {
      try {
        // Validate task data here if needed
        
        // Broadcast to all connected clients
        this.io?.emit('task:created', task);
        
        // Notify admins
        this.io?.to('admin').emit('admin:task:created', task);
        
        // Notify task assignee if any
        if (task.assigneeId) {
          this.io?.to(`user_${task.assigneeId}`).emit('task:assigned', task);
        }
      } catch (error) {
        console.error('Error handling task creation:', error);
      }
    });

    // Listen for task updates
    socket.on('task:update', async (task: any) => {
      try {
        // Broadcast to all connected clients
        this.io?.emit('task:updated', task);
        
        // Notify task assignee if any
        if (task.assigneeId) {
          this.io?.to(`user_${task.assigneeId}`).emit('task:updated:assigned', task);
        }
      } catch (error) {
        console.error('Error handling task update:', error);
      }
    });

    // Listen for task deletion
    socket.on('task:delete', async (taskId: string) => {
      try {
        // Broadcast to all connected clients
        this.io?.emit('task:deleted', { id: taskId });
      } catch (error) {
        console.error('Error handling task deletion:', error);
      }
    });
  }

  // Helper method to emit events
  public emitToUser(userId: number, event: string, data: any): void {
    this.io?.to(`user_${userId}`).emit(event, data);
  }

  // Helper method to emit to all admins
  public emitToAdmins(event: string, data: any): void {
    this.io?.to('admin').emit(event, data);
  }

  // Helper method to emit to all connected clients
  public emitToAll(event: string, data: any): void {
    this.io?.emit(event, data);
  }

  // Get the Socket.IO server instance
  public getIO(): Server | null {
    return this.io;
  }
}

export const webSocketService = WebSocketService.getInstance();
