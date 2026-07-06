import { Router } from 'express';
import {
  findUsername,
  login,
  logout,
  me,
  register,
  requestPasswordReset,
  deleteMe,
  updateProfile
} from '../controllers/authController.js';
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
router.post('/find-username', findUsername);
router.post('/password-reset', requestPasswordReset);
router.get('/me', authMiddleware, me);
router.put('/me', authMiddleware, updateProfile);
router.delete('/me', authMiddleware, deleteMe);

export default router;
