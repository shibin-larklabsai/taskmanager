// Import only the types we need to avoid circular dependencies
import type { Request } from 'express';

// Input types
export interface IRegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface ILoginInput {
  email: string;
  password: string;
}

// Role interface
export interface IRole {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Role interface for user response
export interface IUserRoleResponse extends IRole {}

// User response interface
export interface IUserResponse {
  id: number;
  email: string;
  name: string;
  roles?: IUserRoleResponse[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

// Auth response interface
export interface IAuthResponse {
  user: IUserResponse;
  token: string;
  expiresIn: number;
}

// Decoded JWT token interface
export interface IDecodedToken {
  id: number;
  iat: number;
  exp: number;
}

// Extend Express Request type to include our custom properties
declare global {
  namespace Express {
    interface Request {
      user?: IUserResponse;
      token?: string;
    }
  }
}
