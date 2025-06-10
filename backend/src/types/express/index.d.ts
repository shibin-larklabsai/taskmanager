import { User } from '../../models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string | number;
        roles?: { name: string }[];
      };
      io?: any; // Socket.IO instance
    }
  }
}

export {};
