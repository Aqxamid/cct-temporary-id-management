// Intranet IP validation middleware
// Allows localhost and private network IP ranges only for admin routes.
//
// Security notes:
//  • req.ip is used directly — Express resolves this from the actual TCP
//    socket address (or the first trusted proxy hop when 'trust proxy' is
//    set in server.js).  We do NOT read X-Forwarded-For or X-Real-IP
//    ourselves because those headers can be forged by any client.
//  • IPv6-mapped IPv4 addresses (::ffff:x.x.x.x) are normalised so the
//    same regex set covers both stacks.
//  • Link-local (169.254/16, fe80::/10) and loopback ranges are included
//    because some OS / Docker configurations source from them.
//  • A missing or empty IP is treated as denied — fail-closed.

const PRIVATE_PATTERNS = [
  /^127\./,                              // IPv4 loopback
  /^::1$/,                               // IPv6 loopback
  /^::$/,                                // IPv6 unspecified (defensive)
  /^10\./,                               // RFC 1918 Class A
  /^172\.(1[6-9]|2\d|3[01])\./,         // RFC 1918 Class B
  /^192\.168\./,                         // RFC 1918 Class C
  /^169\.254\./,                         // IPv4 link-local (APIPA)
  /^fe80:/i,                             // IPv6 link-local
  /^localhost$/i,                        // hostname fallback (rare)
];

function normalizeIp(raw) {
  if (!raw || typeof raw !== 'string') return '';
  // Strip IPv6-mapped IPv4 prefix: ::ffff:1.2.3.4 → 1.2.3.4
  return raw.replace(/^::ffff:/i, '').trim();
}

export function intranetOnly(req, res, next) {
  // req.ip is set by Express using only the trust-proxy chain configured in
  // server.js (app.set('trust proxy', 1)).  It is NOT taken from request
  // headers supplied by the client, so it cannot be spoofed via
  // X-Forwarded-For.
  const rawIp = req.ip || req.socket?.remoteAddress || '';
  const ip = normalizeIp(rawIp);

  if (!ip) {
    return res.status(403).json({ error: 'Access denied. Could not determine client IP address.' });
  }

  const allowed = PRIVATE_PATTERNS.some(pattern => pattern.test(ip));

  if (!allowed) {
    // Log the denied attempt (without leaking internal details to the client).
    console.warn(`[intranet] Access denied for IP: ${ip} → ${req.method} ${req.path}`);
    return res.status(403).json({ error: 'Access denied. Admin routes are accessible from the internal network only.' });
  }

  next();
}

