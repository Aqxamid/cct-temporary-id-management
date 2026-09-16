import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getSettings, saveSettings } from '../services/settingsService.js';
import { idTemplateUpload, presidentSignatureUpload } from '../middleware/upload.js';
import {
  getDashboard,
  listStudents,
  getStudent,
  approveStudent,
  rejectStudent,
  updateRecipientEmail,
  downloadStudentDocument,
  processRenewals,
  sendApprovedEmails,
  sendSingleEmail,
  addStudent,
  removeStudent,
} from '../controllers/adminController.js';

const router = Router();

// Note: intranetOnly middleware is applied in server.js for all /admin routes
// but can also be applied here per-route

// Dashboard HTML page
router.get('/', getDashboard);
router.get('/dashboard', getDashboard);

// Student CRUD API
router.get('/api/students', listStudents);
router.get('/api/students/:studentId', getStudent);
router.post('/api/students', addStudent);
router.delete('/api/students/:studentId', removeStudent);

// Bulk approve — MUST be before /:studentId to avoid route collision
router.post('/api/students/bulk-approve', async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'studentIds array required.' });
  }
  const { getStudentById, updateStudent } = await import('../services/dbService.js');
  const results = [];
  for (const id of studentIds) {
    const student = getStudentById(id);
    if (student) {
      const updated = updateStudent(id, { approvalStatus: 'APPROVED', emailStatus: 'READY_TO_SEND' });
      results.push({ studentId: id, success: true, student: updated });
    } else {
      results.push({ studentId: id, error: 'Not found' });
    }
  }
  res.json({ success: true, results });
});

// Individual student actions
router.post('/api/students/:studentId/approve', approveStudent);
router.post('/api/students/:studentId/reject', rejectStudent);
router.post('/api/students/:studentId/download', downloadStudentDocument);
router.get('/api/students/:studentId/download', downloadStudentDocument);
router.post('/api/students/:studentId/email', sendSingleEmail);

// Bulk actions
router.post('/api/email/override', updateRecipientEmail);
router.post('/api/email/send-approved', sendApprovedEmails);
router.post('/api/renewals/process', processRenewals);

// Logged-in admin info
router.get('/api/me', (req, res) => {
  res.json({ adminId: req.admin.adminId, fullName: req.admin.fullName || 'MIS Administrator', role: req.admin.role });
});

// Settings (signer name/role etc.)
router.get('/api/settings', (req, res) => {
  res.json(getSettings());
});
router.patch('/api/settings', (req, res) => {
  const updated = saveSettings(req.body);
  res.json({ success: true, settings: updated });
});

router.post('/api/settings/id-template', idTemplateUpload, (req, res) => {
  res.json({ success: true, message: 'Templates updated' });
});

router.post('/api/settings/president-signature', presidentSignatureUpload, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `public/images/${req.file.filename}`;
  const updated = saveSettings({ presidentSignatureUrl: url });
  res.json({ success: true, settings: updated });
});

export default router;
