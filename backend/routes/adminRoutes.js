import { Router } from 'express';
import {
  getDashboard,
  listAllReviews,
  listUsers,
  updateReviewVisibility,
  updateUserApproval,
  updateUserRole
} from '../controllers/adminController.js';
import {
  answerQuestion,
  createCoupon,
  listAllCoupons,
  listAllQuestions,
  updateCoupon
} from '../controllers/shopFeatureController.js';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/dashboard', authMiddleware, adminMiddleware, getDashboard);
router.get('/users', authMiddleware, adminMiddleware, listUsers);
router.patch('/users/:id/approval', authMiddleware, adminMiddleware, updateUserApproval);
router.patch('/users/:id/role', authMiddleware, adminMiddleware, updateUserRole);
router.get('/reviews', authMiddleware, adminMiddleware, listAllReviews);
router.patch('/reviews/:reviewId/visibility', authMiddleware, adminMiddleware, updateReviewVisibility);
router.get('/questions', authMiddleware, adminMiddleware, listAllQuestions);
router.patch('/questions/:questionId/answer', authMiddleware, adminMiddleware, answerQuestion);
router.get('/coupons', authMiddleware, adminMiddleware, listAllCoupons);
router.post('/coupons', authMiddleware, adminMiddleware, createCoupon);
router.patch('/coupons/:couponId', authMiddleware, adminMiddleware, updateCoupon);

export default router;
