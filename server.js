import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

import { PORT } from './src/config/env.js';
import { requireAdminAuth } from './src/middleware/auth.js';
import { intranetOnly } from './src/middleware/intranet.js';
import './src/services/db.js';
import authRoutes from './src/routes/authRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import studentRoutes from './src/routes/studentRoutes.js';
import renewalRoutes from './src/routes/renewalRoutes.js';
import { getStudentById, hasSubmittedAssets } from './src/services/dbService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure required directories exist
const dirs = [
  'uploads/photos',
  'uploads/signatures',
  'uploads/qrcodes',
  'uploads/documents',
  'data',
];
dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

const app = express();

// Trust proxy for accurate IP detection
app.set('trust proxy', 1);

// Middleware
app.use(cors());
// Uploads are sent as base64 data URLs, which are ~33% larger than the file.
// 12 MB of body allows a 5 MB photo plus a 5 MB signature with headroom.
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(cookieParser());

// Serve favicon
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'favicon.ico')));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root redirect to admin dashboard
app.get('/', (req, res) => res.redirect('/admin'));

// Public Authentication API
app.use('/api/auth', authRoutes);

// Public Admin Login Page
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'views', 'adminLogin.html'));
});

// Protected Routes
app.use('/admin', intranetOnly, requireAdminAuth, adminRoutes);
app.use('/api/renew', renewalRoutes);
app.use('/', studentRoutes);

// ID card print view
app.get('/id-card/:studentId', (req, res) => {
  const student = getStudentById(req.params.studentId);
  if (!student) {
    return res.status(404).send('Student not found.');
  }
  if (!hasSubmittedAssets(student)) {
    return res.status(409).send('This student is reference data only and has not submitted a temporary ID request.');
  }
  res.sendFile(path.join(__dirname, 'src', 'views', 'idCardTemplate.html'));
});


// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html><html><head><title>Not Found</title>
    <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f7f8fa;margin:0;}
    .card{background:#fff;border-radius:12px;padding:40px;text-align:center;border:1px solid #e5e7eb;max-width:400px;}
    h2{color:#172235;margin:0 0 10px;}p{color:#64748b;}a{color:#d73925;text-decoration:none;font-weight:700;}</style></head>
    <body><div class="card"><h2>404 — Page Not Found</h2><p>The page you're looking for doesn't exist.</p><a href="/admin">← Back to Dashboard</a></div></body></html>
  `);
});

// Error handler
// Never leak raw database/driver messages (e.g. "field value too long") to the
// browser — translate them into a message the user can act on.
function friendlyErrorMessage(err) {
  const raw = String(err?.message || '');
  const code = String(err?.code || '');

  // Specific upload limits first — their messages also contain "too long".
  if (code === 'LIMIT_FIELD_VALUE' || /field value too long/i.test(raw)) {
    return 'Your photo or signature image is too large. The maximum allowed size is 5 MB. Please compress or resize the image and try again.';
  }
  if (code === 'LIMIT_FILE_SIZE' || /file too large/i.test(raw)) {
    return 'The uploaded file is too large. The maximum allowed size is 5 MB.';
  }
  if (code === 'LIMIT_FIELD_COUNT' || code === 'LIMIT_PART_COUNT') {
    return 'Too many fields were sent with the upload. Please try again.';
  }
  if (code === 'LIMIT_UNEXPECTED_FILE') {
    return 'Unexpected file field in the upload. Please try again.';
  }
  if (code === 'SQLITE_TOOBIG' || /string or blob too big/i.test(raw)) {
    return 'The uploaded image is too large to save. Please use a smaller photo or signature (max 5 MB) and try again.';
  }
  if (code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint failed/i.test(raw)) {
    return 'This record already exists.';
  }
  if (code === 'SQLITE_CONSTRAINT' || /constraint failed/i.test(raw)) {
    return 'Some required information is missing or invalid.';
  }
  if (/^SQLITE_/i.test(code) || /SQLITE_/i.test(raw)) {
    return 'The request could not be saved. Please try again.';
  }
  if (err?.type === 'entity.too.large') {
    return 'The uploaded data is too large. Please use a smaller image and try again.';
  }
  return raw || 'Internal server error';
}

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const isTooLarge = ['LIMIT_FILE_SIZE', 'LIMIT_FIELD_VALUE', 'SQLITE_TOOBIG'].includes(err?.code)
    || err?.type === 'entity.too.large';
  const status = err?.status || err?.statusCode || (isTooLarge ? 413 : 500);
  res.status(status).json({ error: friendlyErrorMessage(err) });
});

app.listen(PORT, () => {
  console.log(`\nStudent ID Management System`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(` Server running at http://localhost:${PORT}`);
  console.log(` Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(` Student Upload: http://localhost:${PORT}/upload/:token`);
  console.log(` QR Renewal: http://localhost:${PORT}/api/renew`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
