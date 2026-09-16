import { Router } from 'express';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';
import { uploadFields } from '../middleware/upload.js';
import {
  getUploadPage,
  getStudentData,
  handleAssetUpload,
  getPublicEntryPage,
  lookupStudent
} from '../controllers/studentController.js';

const router = Router();

// Entry page (No token)
router.get('/upload', getPublicEntryPage);
router.post('/api/student/lookup', lookupStudent);

// Serve the student upload portal page
router.get('/upload/:token', getUploadPage);

// Get student info by token (for populating the form)
router.get('/api/student/:token', getStudentData);

// Handle file upload submission
router.post('/api/student/upload/:token', uploadRateLimiter, uploadFields, handleAssetUpload);

export default router;
