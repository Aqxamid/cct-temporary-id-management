import { Router } from 'express';
import { requestRenewal } from '../controllers/renewalController.js';

const router = Router();

// QR code renewal endpoint (public)
router.get('/', requestRenewal);

export default router;
