import jwt from 'jsonwebtoken';
import { IDecodedToken } from '../types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'task-management-api';

/**
 * Generate JWT token
 */
export const generateToken = (userId: number): string => {
  return jwt.sign(
    { id: userId },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
    }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): Promise<IDecodedToken> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      resolve(decoded as IDecodedToken);
    });
  });
};

/**
 * Decode JWT token without verification
 */
export const decodeToken = (token: string): IDecodedToken | null => {
  try {
    return jwt.decode(token) as IDecodedToken;
  } catch (error) {
    return null;
  }
};

/**
 * Get token from request headers
 */
export const getTokenFromHeader = (req: any): string | null => {
  if (
    req.headers.authorization &&
    req.headers.authorization.split(' ')[0] === 'Bearer'
  ) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};
