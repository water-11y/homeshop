import { Router } from 'express';
import {
  exportDashboardCsv,
  getDashboard,
  listActivityLogs,
  listAllReviews,
  listUsers,
  updateReviewVisibility,
  updateUserApproval,
  updateUserRole
} from '../controllers/adminController.js';
import {
  answerQuestion,
  broadcastNotification,
  createCoupon,
  listAdminFaqs,
  listAdminNotices,
  listAllCoupons,
  listAllQuestions,
  saveFaq,
  saveNotice,
  updateLegalPage,
  updateCoupon
} from '../controllers/shopFeatureController.js';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/dashboard', authMiddleware, adminMiddleware, getDashboard);
router.get('/dashboard/export', authMiddleware, adminMiddleware, exportDashboardCsv);
router.get('/activity-logs', authMiddleware, adminMiddleware, listActivityLogs);
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
router.get('/notices', authMiddleware, adminMiddleware, listAdminNotices);
router.post('/notices', authMiddleware, adminMiddleware, saveNotice);
router.put('/notices/:noticeId', authMiddleware, adminMiddleware, saveNotice);
router.get('/faqs', authMiddleware, adminMiddleware, listAdminFaqs);
router.post('/faqs', authMiddleware, adminMiddleware, saveFaq);
router.put('/faqs/:faqId', authMiddleware, adminMiddleware, saveFaq);
router.put('/legal/:slug', authMiddleware, adminMiddleware, updateLegalPage);
router.post('/notifications/broadcast', authMiddleware, adminMiddleware, broadcastNotification);

export default router;
