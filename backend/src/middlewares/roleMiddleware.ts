import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../database/models/User.model';

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Bạn chưa được xác thực danh tính'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Quyền truy cập bị từ chối. Chỉ các vai trò [${allowedRoles.join(', ')}] mới có quyền thực hiện chức năng này.`
      });
      return;
    }

    next();
  };
};
