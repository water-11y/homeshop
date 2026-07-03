import { Router } from 'express';
import {
  createAddress,
  deleteAddress,
  listAddresses,
  listCoupons,
  listNotifications,
  listRecentlyViewed,
  listWishlist,
  markAllNotificationsRead,
  markNotificationRead,
  markRecentlyViewed,
  setDefaultAddress,
  updateAddress,
  validateCoupon
} from '../controllers/shopFeatureController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/wishlist', authMiddleware, listWishlist);
router.get('/coupons', authMiddleware, listCoupons);
router.post('/coupons/validate', authMiddleware, validateCoupon);
router.get('/addresses', authMiddleware, listAddresses);
router.post('/addresses', authMiddleware, createAddress);
router.put('/addresses/:addressId', authMiddleware, updateAddress);
router.delete('/addresses/:addressId', authMiddleware, deleteAddress);
router.patch('/addresses/:addressId/default', authMiddleware, setDefaultAddress);
router.get('/recently-viewed', authMiddleware, listRecentlyViewed);
router.post('/recently-viewed/:productId', authMiddleware, markRecentlyViewed);
router.get('/notifications', authMiddleware, listNotifications);
router.patch('/notifications/read-all', authMiddleware, markAllNotificationsRead);
router.patch('/notifications/:notificationId/read', authMiddleware, markNotificationRead);

export default router;
