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
    // Create Socket.IO server with enhanced CORS and logging
    const allowedOrigins = process.env.FRONTEND_URL?.split(',').map(s => s.trim()) || [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://localhost:8000',
      'http://127.0.0.1:8000'
    ];

    console.log('WebSocket allowed origins:', allowedOrigins);

    this.io = new Server(server, {
      path: '/socket.io',
      cors: {
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps or curl requests)
          if (!origin) return callback(null, true);
          
          if (allowedOrigins.includes(origin)) {
            console.log('Allowed origin:', origin);
            return callback(null, true);
          }
          
          console.warn('CORS blocked origin:', origin);
          return callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        credentials: true
      },
      allowEIO3: true,
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      cookie: false
    });
    
    console.log('WebSocket server initialized with path:', '/socket.io');

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
      console.log(`[WebSocket] New connection received. Socket ID: ${socket.id}`);
      console.log('[WebSocket] Socket details:', {
        handshake: {
          headers: socket.handshake.headers,
          query: socket.handshake.query,
          auth: socket.handshake.auth
        },
        connected: socket.connected,
        disconnected: socket.disconnected,
        user: socket.user
      });
      
      if (!socket.user?.id) {
        const error = new Error('No user ID found in socket');
        console.error('[WebSocket] Connection rejected:', error.message);
        socket.emit('auth_error', { message: 'Authentication failed: No user ID' });
        socket.disconnect(true);
        return;
      }

      // Join user to their own room for private messages
      const userRoom = `user_${socket.user.id}`;
      
      // Leave any existing rooms to prevent duplicates
      const rooms = Object.keys(socket.rooms).filter(room => room !== socket.id);
      if (rooms.length > 0) {
        console.log(`[WebSocket] User ${socket.user.id} leaving existing rooms:`, rooms);
        rooms.forEach(room => socket.leave(room));
      }
      
      socket.join(userRoom, (err: Error | null) => {
        if (err) {
          console.error(`[WebSocket] Error joining room ${userRoom}:`, err);
          return;
        }
        console.log(`[WebSocket] User ${socket.user.id} successfully joined room: ${userRoom}`);
        console.log(`[WebSocket] User ${socket.user.id} current rooms:`, socket.rooms);
        
        // Acknowledge successful room join
        socket.emit('room-joined', { room: userRoom, status: 'success' });
      });
      
      // Join user to admin room if they are an admin
      const userRoles = Array.isArray(socket.user?.roles) 
        ? socket.user.roles 
        : [];
        
      const isAdmin = userRoles.some((role: any) => 
        role && (role.name === 'admin' || role === 'admin' || role.name === 'ADMIN' || role === 'ADMIN')
      );
      
      if (isAdmin) {
        const adminRoom = 'admin';
        socket.join(adminRoom, (err: Error | null) => {
          if (err) {
            console.error(`[WebSocket] Error joining admin room:`, err);
            return;
          }
          console.log(`[WebSocket] Admin user ${socket.user.id} joined admin room`);
          socket.emit('room-joined', { room: adminRoom, status: 'success' });
        });
      }

      // Log all rooms the user is in
      socket.on('connect', () => {
        console.log(`[WebSocket] User ${socket.user.id} connected to rooms:`, socket.rooms);
      });
      
      // Handle join-room event (in case client sends it)
      socket.on('join-room', (roomData: string | { room: string }, callback: Function) => {
        // Handle both string and object formats for room
        const room = typeof roomData === 'string' ? roomData : roomData?.room;
        
        if (!room) {
          const error = 'No room specified in join-room event';
          console.error(`[WebSocket] ${error}`, { roomData });
          if (typeof callback === 'function') {
            callback({ status: 'error', error });
          }
          return;
        }
        
        console.log(`[WebSocket] User ${socket.user.id} requested to join room:`, room);
        
        // Leave any existing rooms with the same prefix to prevent duplicates
        const roomPrefix = room.split('_')[0] + '_';
        const roomsToLeave = Object.keys(socket.rooms).filter(
          r => r !== socket.id && r.startsWith(roomPrefix)
        );
        
        if (roomsToLeave.length > 0) {
          console.log(`[WebSocket] Leaving existing rooms:`, roomsToLeave);
          roomsToLeave.forEach(r => socket.leave(r));
        }
        
        socket.join(room, (err: Error | null) => {
          if (err) {
            console.error(`[WebSocket] Error joining room ${room}:`, err);
            if (typeof callback === 'function') {
              callback({ status: 'error', error: err.message });
            }
            return;
          }
          
          console.log(`[WebSocket] User ${socket.user.id} successfully joined room: ${room}`);
          console.log(`[WebSocket] User ${socket.user.id} current rooms:`, socket.rooms);
          
          if (typeof callback === 'function') {
            callback({ status: 'success', room });
          }
        });
      });

      // Handle notification event
      socket.on('notification', (data: any) => {
        console.log(`[WebSocket] Received notification for user ${socket.user.id}:`, data);
        // Broadcast to all clients in the user's room
        socket.to(userRoom).emit('notification', data);
      });

      // Handle send-notification event (from admin/developers)
      socket.on('send-notification', (data: any) => {
        console.log(`[WebSocket] Received send-notification from user ${socket.user.id}:`, data);
        
        const { userIds = [], ...notificationData } = data;
        
        // If no userIds are specified, broadcast to all connected clients
        if (!userIds || userIds.length === 0) {
          console.log('[WebSocket] Broadcasting notification to all connected clients');
          this.io?.emit('notification', {
            ...notificationData,
            isBroadcast: true,
            timestamp: new Date().toISOString()
          });
        } else {
          // Otherwise, send to specific users
          console.log(`[WebSocket] Sending notification to users:`, userIds);
          userIds.forEach((userId: string | number) => {
            this.io?.to(`user_${userId}`).emit('notification', {
              ...notificationData,
              targetUserId: userId,
              timestamp: new Date().toISOString()
            });
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason: string) => {
        console.log(`[WebSocket] User ${socket.user?.id} disconnected. Reason: ${reason}`);
        console.log(`[WebSocket] User ${socket.user?.id} was in rooms:`, socket.rooms);
      });

      // Log any errors
      socket.on('error', (error: Error) => {
        console.error(`[WebSocket] Error for user ${socket.user?.id}:`, error);
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
