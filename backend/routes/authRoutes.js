import { Router } from 'express';
import { login, logout, me, register } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { registerUpload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.post('/register', (req, res, next) => {
  registerUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    next();
  });
}, register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);

export default router;
