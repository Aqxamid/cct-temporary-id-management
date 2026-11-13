// Intranet IP validation middleware
// Allows localhost and private network IP ranges only for admin routes
export function intranetOnly(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || '';

  // Normalize IPv6-mapped IPv4 addresses
  const normalizedIp = ip.replace('::ffff:', '');

  const allowedPatterns = [
    /^127\./,           // loopback
    /^::1$/,            // IPv6 loopback
    /^10\./,            // Class A private
    /^172\.(1[6-9]|2\d|3[01])\./,  // Class B private
    /^192\.168\./,      // Class C private
    /^localhost$/,
  ];

  const isAllowed = allowedPatterns.some(pattern => pattern.test(normalizedIp));

  if (!isAllowed) {
    return res.status(403).json({ error: 'Access denied. Admin routes are intranet-only.' });
  }

  next();
}
