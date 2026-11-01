import { Router } from 'express';
import {
  getAllUsers,
  createAdminUser,
  updateUserRole,
  toggleUserStatus,
  deleteAdminUser,
  getAuditLogs,
  getSystemSettings,
  updateSystemSetting
} from './admin.controller';
import { authenticateToken } from '../../middlewares/authMiddleware';
import { requireRole } from '../../middlewares/roleMiddleware';

const router = Router();

// Toàn bộ routes này được bảo vệ nghiêm ngặt: Phải đăng nhập VÀ có Role ADMIN
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/users', getAllUsers);
router.post('/users', createAdminUser);
router.patch('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/status', toggleUserStatus);
router.delete('/users/:userId', deleteAdminUser);
router.get('/audit-logs', getAuditLogs);
router.get('/settings', getSystemSettings);
router.put('/settings/:key', updateSystemSetting);

export default router;
