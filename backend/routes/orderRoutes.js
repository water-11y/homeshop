import { Router } from 'express';
import {
  cancelOrder,
  createOrder,
  getOrder,
  listAllOrders,
  listMyOrders,
  updateOrderStatus
} from '../controllers/orderController.js';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', authMiddleware, createOrder);
router.get('/my', authMiddleware, listMyOrders);
router.get('/admin', authMiddleware, adminMiddleware, listAllOrders);
router.get('/:id', authMiddleware, getOrder);
router.patch('/:id/cancel', authMiddleware, cancelOrder);
router.patch('/:id/status', authMiddleware, adminMiddleware, updateOrderStatus);

export default router;
