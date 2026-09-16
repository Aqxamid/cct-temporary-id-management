import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

import { PORT } from './src/config/env.js';
import { requireAdminAuth } from './src/middleware/auth.js';
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
  'templates',
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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
app.use('/admin', requireAdminAuth, adminRoutes);
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
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
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
