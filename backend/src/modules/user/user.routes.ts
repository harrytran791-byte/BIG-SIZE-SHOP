import { Router } from 'express';
import {
  getBodyProfile,
  saveBodyProfile,
  getMyOrders,
  submitReturnRequest
} from './user.controller';
import { authenticateToken } from '../../middlewares/authMiddleware';

const router = Router();

// Toàn bộ routes dành cho Khách hàng đã đăng nhập
router.use(authenticateToken);

router.get('/body-profile', getBodyProfile);
router.post('/body-profile', saveBodyProfile);
router.get('/orders', getMyOrders);
router.post('/returns', submitReturnRequest);

export default router;
