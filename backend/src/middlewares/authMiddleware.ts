import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UserRole } from '../database/models/User.model';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập để truy cập tài nguyên này (Missing Token)'
    });
    return;
  }

  jwt.verify(token, config.jwt.secret, (err, decodedUser) => {
    if (err) {
      res.status(403).json({
        success: false,
        message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn'
      });
      return;
    }

    req.user = decodedUser as AuthenticatedUser;
    next();
  });
};
