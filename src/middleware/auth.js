import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export function requireAdminAuth(req, res, next) {
  const token = req.cookies.admin_session;

  if (!token) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized. Admin login required.' });
    }
    return res.redirect('/admin/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded; 
    next();
  } catch (err) {
    res.clearCookie('admin_session');
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Invalid or expired session.' });
    }
    return res.redirect('/admin/login');
  }
}
