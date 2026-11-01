import { Router } from 'express';
import {
  getStoreStats,
  createProduct,
  updateVariantStock,
  getLowStockAlerts,
  updateOrderStatus,
  handleReturnRequest
} from './manager.controller';
import { authenticateToken } from '../../middlewares/authMiddleware';
import { requireRole } from '../../middlewares/roleMiddleware';

const router = Router();

// Phân hệ Vận hành cửa hàng: Dành cho MANAGER hoặc ADMIN
router.use(authenticateToken);
router.use(requireRole(['MANAGER', 'ADMIN']));

router.get('/stats', getStoreStats);
router.post('/products', createProduct);
router.patch('/inventory/variants/:variantId', updateVariantStock);
router.get('/inventory/low-stock', getLowStockAlerts);
router.patch('/orders/:orderId/status', updateOrderStatus);
router.patch('/returns/:requestId', handleReturnRequest);

export default router;
