import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string | number;
        roles?: Array<{ name: string }>;
      };
      io?: any; // WebSocket instance
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string | number;
    roles?: Array<{ name: string }>;
  };
  io?: any;
}

export {};
