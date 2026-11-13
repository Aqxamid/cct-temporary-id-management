import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getAdminByUsername } from '../services/dbService.js';
import { recordActivity } from '../services/logService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_intranet_key_2026';

// 1. Admin Login Handler
export async function loginAdmin(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = await getAdminByUsername(username);
  if (!admin) {
    recordActivity({
      action: 'LOGIN_FAILED',
      category: 'auth',
      description: `Failed login attempt for username "${username}".`,
      ip: req.ip || '',
      status: 'error',
    });
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Verify password hash
  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) {
    recordActivity({
      action: 'LOGIN_FAILED',
      category: 'auth',
      description: `Failed login attempt for username "${username}".`,
      ip: req.ip || '',
      status: 'error',
    });
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Generate 8-hour JWT token
  const token = jwt.sign(
    { adminId: admin.adminId, username: admin.username, role: admin.role, fullName: admin.fullName },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  // Set secure HTTP-only cookie
  res.cookie('admin_session', token, {
    httpOnly: true, // Prevents XSS script theft
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000 // 8 hours
  });

  recordActivity({
    action: 'LOGIN_SUCCESS',
    category: 'auth',
    description: `${admin.fullName || admin.username} signed in.`,
    admin: admin.username,
    ip: req.ip || '',
  });

  res.json({ success: true, message: 'Login successful.', redirectUrl: '/admin' });
}

// 2. Admin Logout Handler
export function logoutAdmin(req, res) {
  if (req.admin?.username) {
    recordActivity({
      action: 'LOGOUT',
      category: 'auth',
      description: `${req.admin.fullName || req.admin.username} signed out.`,
      admin: req.admin.username,
      ip: req.ip || '',
    });
  }
  res.clearCookie('admin_session');
  res.json({ success: true, message: 'Logged out successfully.', redirectUrl: '/admin/login' });
}

// 3. Current Session Check
export function getSessionStatus(req, res) {
  res.json({ authenticated: true, admin: req.admin });
}
