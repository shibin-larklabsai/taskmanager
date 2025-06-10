import express, { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer, Server } from 'http';
import { sequelize } from './config/database.js';
import './models/index.js'; // Import models to register them with Sequelize
import { webSocketService } from './services/websocket.service.js';

// Extend Express Request type to include io and user
declare global {
  namespace Express {
    interface Request {
      cors?: boolean;
      io?: any; // WebSocket server instance
    }
  }
}

dotenv.config();

class App {
  public app: Express;
  public port: number;
  public server: Server;

  constructor(port: number) {
    this.app = express();
    // Ensure we use the provided port
    this.port = port;
    this.server = createServer(this.app);
    
    // Debug log the port being used
    console.log(`🔧 Attempting to start server on port: ${this.port}`);
    
    // Initialize database connection and routes
    this.initialize()
      .catch(error => {
        console.error('Failed to initialize application:', error);
        process.exit(1);
      });
  }

  private async initialize(): Promise<void> {
    await this.initializeDatabase();
    this.initializeMiddlewares();
    await this.initializeRoutes();
    this.initializeErrorHandling();
    
    // Initialize WebSocket server
    await this.initializeWebSocket();
    
    // Start the server after everything is initialized
    this.start();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      // Test the database connection
      await sequelize.authenticate();
      console.log('✅ Database connection has been established successfully.');
      
      // Sync all models with the database
      await sequelize.sync({ alter: true });
      console.log('🔄 Database synchronized');
    } catch (error) {
      console.error('❌ Unable to connect to the database:', error);
      process.exit(1);
    }
  }

  private initializeMiddlewares(): void {
    // Configure CORS with specific origin and credentials support
    const allowedOrigins = [
      'http://localhost:3000', // Frontend development server
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://localhost:8000',
      'http://127.0.0.1:8000'
    ];
    
    console.log('Allowed CORS origins:', allowedOrigins);
    
    // Configure CORS options
    const corsOptions: cors.CorsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, origin?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        console.error(msg);
        return callback(new Error(msg), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Auth-Token'],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      maxAge: 600
    };

    // Enable CORS for all routes
    this.app.use(cors(corsOptions));
    
    // Handle preflight requests for all routes with named parameter for Express 5.x compatibility
    this.app.options('*path', cors(corsOptions));
    
    // Parse JSON and URL-encoded bodies
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Attach WebSocket server to request object
    const attachWebSocket: RequestHandler = (req, _res, next) => {
      req.io = webSocketService.getIO();
      next();
    };
    this.app.use(attachWebSocket);
  }

  private async initializeRoutes(): Promise<void> {
    try {
      // Import routes
      const taskRoutes = (await import('./routes/task.routes.js')).default;
      const projectRoutes = (await import('./routes/project.routes.js')).default;
      const authRoutes = (await import('./routes/auth.routes.js')).default;
      const adminRoutes = (await import('./routes/admin.routes.js')).default;
      const userRoutes = (await import('./routes/user.routes.js')).default;
      const commentRoutes = (await import('./routes/comment.routes.js')).default;

      // Test database connection endpoint
      this.app.get('/api/test-db', async (_req, res) => {
        try {
          const [results] = await sequelize.query('SELECT * FROM users');
          res.json({
            success: true,
            message: 'Database connection successful',
            data: results
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Database test error:', error);
          res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: errorMessage
          });
        }
      });

      // API routes
      this.app.use('/api/tasks', taskRoutes);
      this.app.use('/api/projects', projectRoutes);
      this.app.use('/api/auth', authRoutes);
      this.app.use('/api/admin', adminRoutes);
      this.app.use('/api/users', userRoutes);
      this.app.use('/api/comments', commentRoutes);

      // Health check endpoints
      this.app.get('/api/health', (_, res) => {
        console.log('Health check endpoint called');
        res.status(200).json({ status: 'ok' });
      });

      this.app.get('/health', (_req: Request, res: Response) => {
        res.status(200).json({ status: 'ok', message: 'Server is running' });
      });

      console.log('✅ Routes initialized successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load routes:', errorMessage);
      throw error;
    }

    // 404 handler
    const notFoundHandler: express.RequestHandler = (_req, res) => {
      res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    };
    this.app.use(notFoundHandler);
  }

  private async initializeWebSocket(): Promise<void> {
    try {
      await webSocketService.initialize(this.server);
      console.log('✅ WebSocket server initialized');
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket server:', error);
      process.exit(1);
    }
  }

  private initializeErrorHandling(): void {
    // Handle 404 errors
    this.app.use((_req, _res, next) => {
      const error = new Error('Not Found');
      (error as any).status = 404;
      next(error);
    });
    
    // Error handling middleware
    this.app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      // Check if headers have already been sent
      if (res.headersSent) {
        console.error('Headers already sent, cannot send error response');
        return;
      }

      try {
        console.error('Error:', err.stack || err);
        
        // Default to 500 if status not set
        const status = err.status || 500;
        let message = err.message || 'Internal Server Error';

        // Handle specific error types
        if (err.name === 'JsonWebTokenError') {
          message = 'Invalid token';
        } else if (err.name === 'TokenExpiredError') {
          message = 'Token expired';
        } else if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
          // Handle Sequelize validation errors
          message = err.errors?.map((e: any) => e.message).join(', ') || message;
        }
        
        // Prepare error response
        const errorResponse: any = {
          success: false,
          message: process.env.NODE_ENV === 'production' && status >= 500 
            ? 'Internal server error' 
            : message
        };
        
        // Include error stack in development
        if (process.env.NODE_ENV === 'development') {
          errorResponse.stack = err.stack;
        }
        
        // Send the error response
        res.status(status).json(errorResponse);
        return undefined;
      } catch (error) {
        console.error('Error in error handler:', error);
        // Final fallback if something goes wrong in the error handler
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Internal Server Error'
          });
        }
        return undefined;
      }
    });
  }

  private start(): void {
    console.log('🔄 Starting server...');
    
    try {
      // Add error handler for the server
      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${this.port} is already in use.`);
        } else {
          console.error('❌ Server error:', error);
        }
        process.exit(1);
      });

      // Start listening
      this.server.listen(this.port, '0.0.0.0', () => {
        const addr = this.server.address();
        const host = addr && typeof addr === 'object' ? addr.address : addr;
        const port = addr && typeof addr === 'object' ? addr.port : this.port;
        console.log(`🚀 Server is running on http://${host}:${port}`);
        console.log(`🌐 WebSocket server is running on ws://localhost:${port}`);
        console.log(`🔍 Try accessing: http://localhost:${port}/api/health`);
      });
      
      // Debug log all addresses the server is listening on
      this.server.on('listening', () => {
        const addr = this.server.address();
        const bind = typeof addr === 'string' 
          ? `pipe ${addr}` 
          : `port ${addr?.port} on ${addr?.address}`;
        console.log(`🔍 Server listening on ${bind}`);
      });

      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason: Error | any, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        this.server.close(() => process.exit(1));
      });

      // Handle uncaught exceptions
      process.on('uncaughtException', (err: Error) => {
        console.error('Uncaught Exception:', err);
        this.server.close(() => process.exit(1));
      });

      // Handle termination signals
      const gracefulShutdown = (signal: string) => {
        console.log(`\n🛑 Received ${signal}. Closing server...`);
        this.server.close(() => {
          console.log('👋 Server closed');
          process.exit(0);
        });
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Export the App class for testing and extension
export { App };
