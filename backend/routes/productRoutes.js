import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listCategories,
  listProducts,
  updateProduct
} from '../controllers/productController.js';
import {
  createReview,
  deleteReview,
  listProductReviews,
  updateReview
} from '../controllers/reviewController.js';
import { adminMiddleware, authMiddleware } from '../middleware/authMiddleware.js';
import {
  addWishlist,
  createQuestion,
  listQuestions,
  removeWishlist
} from '../controllers/shopFeatureController.js';

const router = Router();

router.get('/', listProducts);
router.get('/categories', listCategories);
router.get('/:productId/reviews', listProductReviews);
router.post('/:productId/reviews', authMiddleware, createReview);
router.get('/:productId/questions', authMiddleware, listQuestions);
router.post('/:productId/questions', authMiddleware, createQuestion);
router.post('/:productId/wishlist', authMiddleware, addWishlist);
router.delete('/:productId/wishlist', authMiddleware, removeWishlist);
router.put('/reviews/:reviewId', authMiddleware, updateReview);
router.delete('/reviews/:reviewId', authMiddleware, deleteReview);
router.get('/:id', getProduct);
router.post('/', authMiddleware, adminMiddleware, createProduct);
router.put('/:id', authMiddleware, adminMiddleware, updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, deleteProduct);

export default router;
