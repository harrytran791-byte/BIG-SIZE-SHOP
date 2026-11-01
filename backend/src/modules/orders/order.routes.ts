import { Router } from 'express';
import { checkout, trackOrder } from './order.controller';
import { authenticateToken } from '../../middlewares/authMiddleware';

const router = Router();

// Route checkout bắt buộc xác thực danh tính người dùng bằng JWT
router.post('/checkout', authenticateToken, checkout);
router.get('/track/:code', trackOrder);

export default router;
