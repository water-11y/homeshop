import { Router } from 'express';
import { listCoupons, listWishlist, validateCoupon } from '../controllers/shopFeatureController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/wishlist', authMiddleware, listWishlist);
router.get('/coupons', authMiddleware, listCoupons);
router.post('/coupons/validate', authMiddleware, validateCoupon);

export default router;
