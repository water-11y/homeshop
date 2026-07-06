import { Router } from 'express';
import {
  cancelOrder,
  createOrder,
  createRefundRequest,
  getOrder,
  listAllOrders,
  listRefundRequests,
  listMyOrders,
  reviewRefundRequest,
  updateOrderStatus
} from '../controllers/orderController.js';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authMiddleware, createOrder);
router.get('/my', authMiddleware, listMyOrders);
router.get('/admin', authMiddleware, adminMiddleware, listAllOrders);
router.get('/admin/refunds', authMiddleware, adminMiddleware, listRefundRequests);
router.get('/:id', authMiddleware, getOrder);
router.post('/:id/refund-request', authMiddleware, createRefundRequest);
router.patch('/:id/cancel', authMiddleware, cancelOrder);
router.patch('/:id/status', authMiddleware, adminMiddleware, updateOrderStatus);
router.patch('/admin/refunds/:refundId', authMiddleware, adminMiddleware, reviewRefundRequest);

export default router;
