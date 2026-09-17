import path from 'path';
import fs from 'fs';
import {
  getAllStudents,
  getStudentById,
  hasSubmittedAssets,
  updateStudent,
  updateStudentOverrideEmail,
  updateStudentExpiry,
  createStudent,
  deleteStudent,
} from '../services/dbService.js';
import { populateStudentDocument } from '../services/documentService.js';
import { processBulkEmailQueue, sendStudentEmail } from '../services/emailService.js';
import { importStudentsFromFile } from '../services/studentImportService.js';
import { PUBLIC_BASE_URL } from '../config/env.js';
import { getRequestLogs } from '../services/logService.js';

export function getDashboard(req, res) {
  res.sendFile(path.join(process.cwd(), 'src', 'views', 'adminDashboard.html'));
}

export function listStudents(req, res) {
  res.set('Cache-Control', 'no-store');
  const students = getAllStudents();
  res.json(students);
}

export function listRequestLogs(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json(getRequestLogs(req.query.limit));
}

export function getStudent(req, res) {
  const { studentId } = req.params;
  const student = getStudentById(studentId);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (!hasSubmittedAssets(student)) {
    return res.status(409).json({ error: 'This student is reference data only and has not submitted a temporary ID request.' });
  }
  res.json(student);
}

export async function approveStudent(req, res) {
  const { studentId } = req.params;
  const student = getStudentById(studentId);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (student.approvalStatus !== 'PENDING_REVIEW' || student.renewalStatus === 'RENEWAL_REQUESTED') {
    return res.status(400).json({ error: 'Only submissions pending review can be approved.' });
  }

  const updated = updateStudent(studentId, {
    approvalStatus: 'APPROVED',
    emailStatus: 'READY_TO_SEND',
  });

  res.json({ success: true, student: updated });
}

export async function rejectStudent(req, res) {
  const { studentId } = req.params;
  const { reason } = req.body;
  const student = getStudentById(studentId);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (student.approvalStatus !== 'PENDING_REVIEW' || student.renewalStatus === 'RENEWAL_REQUESTED') {
    return res.status(400).json({ error: 'Only submissions pending review can be rejected.' });
  }

  const updated = updateStudent(studentId, {
    approvalStatus: 'REJECTED',
    rejectionReason: reason || '',
    emailStatus: 'NOT_READY',
  });

  res.json({ success: true, student: updated });
}

export async function updateRecipientEmail(req, res) {
  const { studentId, overrideEmail } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(overrideEmail)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }

  const updated = updateStudentOverrideEmail(studentId, overrideEmail);
  if (!updated) return res.status(404).json({ error: 'Student not found.' });

  res.json({ success: true, message: `Recipient email updated to ${overrideEmail}` });
}

export async function downloadStudentDocument(req, res) {
  const { studentId } = req.params;
  const student = getStudentById(studentId);

  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (!hasSubmittedAssets(student)) {
    return res.status(409).json({ error: 'This student has not submitted a photo and signature yet.' });
  }

  const publicBaseUrl = PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;

  try {
    const pdfPath = await populateStudentDocument(student, publicBaseUrl);
    updateStudent(studentId, { pdfPath, emailStatus: 'READY_TO_SEND' });

    res.download(pdfPath, `Temporary_ID_${studentId}.pdf`, err => {
      if (err && !res.headersSent) res.status(500).json({ error: 'Error downloading document.' });
    });
  } catch (err) {
    console.error('Document generation error:', err);
    res.status(500).json({ error: `Document generation failed: ${err.message}` });
  }
}

export async function processRenewals(req, res) {
  const { studentIds, extensionDays = 30 } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'studentIds array required.' });
  }

  const days = Number(extensionDays);
  if (!Number.isInteger(days) || days <= 0 || days > 3650) {
    return res.status(400).json({ error: 'extensionDays must be a positive whole number.' });
  }

  const results = [];

  for (const id of studentIds) {
    const student = getStudentById(id);
    if (!student) {
      results.push({ studentId: id, error: 'Not found' });
      continue;
    }

    if (student.renewalStatus !== 'RENEWAL_REQUESTED') {
      results.push({ studentId: id, error: 'Student has no pending renewal request.' });
      continue;
    }

    const currentExpiry = new Date(student.temporaryExpiryDate);
    if (Number.isNaN(currentExpiry.getTime())) {
      results.push({ studentId: id, error: 'Current expiry date is invalid.' });
      continue;
    }
    currentExpiry.setDate(currentExpiry.getDate() + days);
    const newExpiryDate = currentExpiry.toISOString().split('T')[0];

    const updated = updateStudent(id, {
      temporaryExpiryDate: newExpiryDate,
      renewalStatus: 'RENEWAL_APPROVED',
      approvalStatus: 'APPROVED',
      // Force a fresh PDF before this renewed ID can be emailed.
      pdfPath: '',
      emailStatus: 'NOT_READY',
    });

    results.push({ studentId: id, newExpiryDate, success: Boolean(updated) });
  }

  const failed = results.filter(result => !result.success);
  res.json({
    success: failed.length === 0,
    message: failed.length ? 'Some renewals could not be processed.' : `Renewed ${studentIds.length} ID(s).`,
    results,
  });
}

export async function sendApprovedEmails(req, res) {
  const students = getAllStudents();
  const approved = students.filter(s => (
    s.approvalStatus === 'APPROVED'
    && s.emailStatus === 'READY_TO_SEND'
    && s.pdfPath
    && fs.existsSync(s.pdfPath)
  ));

  if (approved.length === 0) {
    return res.json({ success: true, message: 'No approved students ready to email.', results: {} });
  }

  const results = await processBulkEmailQueue(approved, (id, status) => {
    updateStudent(id, { emailStatus: status === 'SENT' ? 'SENT' : 'FAILED' });
  });

  res.json({ success: true, results });
}

export async function sendSingleEmail(req, res) {
  const { studentId } = req.params;
  const student = getStudentById(studentId);

  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (student.approvalStatus !== 'APPROVED') {
    return res.status(400).json({ error: 'Only approved students can be emailed.' });
  }
  if (!student.pdfPath || !fs.existsSync(student.pdfPath)) {
    return res.status(400).json({ error: 'No current document generated yet. Download the document first.' });
  }

  try {
    const sentTo = await sendStudentEmail(student);
    updateStudent(studentId, { emailStatus: 'SENT' });
    res.json({ success: true, message: `Email sent to ${sentTo}` });
  } catch (err) {
    updateStudent(studentId, { emailStatus: 'FAILED' });
    res.status(500).json({ error: `Email failed: ${err.message}` });
  }
}

export function addStudent(req, res) {
  const data = req.body;

  const student = {
    studentId: data.studentId,
    fullName: data.fullName,
    dob: data.dob,
    email: data.email,
    overrideEmail: '',
    enrollmentStatus: data.enrollmentStatus || 'Enrolled',
    course: data.course || '',
    programStartDate: data.programStartDate || '',
    temporaryExpiryDate: data.temporaryExpiryDate || '',
    guardianName: data.guardianName || '',
    address: data.address || '',
    phone: data.phone || '',
    generatedDate: new Date().toISOString().split('T')[0],
    uploadToken: `token-${Date.now()}`,
    renewalToken: `renew-${Date.now()}`,
    photoUrl: '',
    signatureUrl: '',
    qrCodeUrl: '',
    renewalQrUrl: '',
    pdfPath: '',
    approvalStatus: 'PENDING_UPLOAD',
    renewalStatus: 'NONE',
    emailStatus: 'NOT_READY',
    initials: data.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    tone: ['coral', 'blue', 'plum', 'sage', 'gold', 'lavender'][Math.floor(Math.random() * 6)],
  };

  createStudent(student);
  res.json({ success: true, student });
}

export function importStudents(req, res) {
  if (!req.file?.buffer) {
    return res.status(400).json({ error: 'Please choose a CSV or JSON file to import.' });
  }

  const extension = path.extname(req.file.originalname || '').toLowerCase()
    || (req.file.mimetype === 'application/json' ? '.json' : '.csv');

  try {
    const result = importStudentsFromFile(req.file.buffer, extension);
    res.json({
      success: true,
      message: `Imported ${result.imported} student(s). Skipped ${result.skipped} duplicate(s) and found ${result.invalid} invalid row(s).`,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Student import failed.' });
  }
}

export function removeStudent(req, res) {
  const { studentId } = req.params;
  deleteStudent(studentId);
  res.json({ success: true });
}
