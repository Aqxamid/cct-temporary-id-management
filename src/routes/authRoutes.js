import express from 'express';
import { loginAdmin, logoutAdmin, getSessionStatus } from '../controllers/authController.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.get('/me', requireAdminAuth, getSessionStatus);

export default router;
