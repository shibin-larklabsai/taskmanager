import { IUserResponse } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: IUserResponse;
      token?: string;
    }
  }
}
