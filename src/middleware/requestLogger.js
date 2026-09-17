import { recordRequestLog } from '../services/logService.js';

function safeRoute(req) {
  // Keep the mounted URL visible in the log, but never persist query strings
  // or token/ID values. This also works for 404s and middleware errors.
  return (req.originalUrl || req.path)
    .split('?')[0]
    .replace(/\/upload\/[^/]+/g, '/upload/:token')
    .replace(/\/id-card\/[^/]+/g, '/id-card/:studentId')
    .replace(/\/student\/[^/]+/g, '/student/:token')
    .replace(/\/students\/[^/]+/g, '/students/:studentId');
}

export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    recordRequestLog({
      timestamp: new Date().toISOString(),
      method: req.method,
      route: safeRoute(req),
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip || req.socket?.remoteAddress || '',
      admin: req.admin?.username || null,
    });
  });

  next();
}
