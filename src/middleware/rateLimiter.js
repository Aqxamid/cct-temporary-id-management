import rateLimit from 'express-rate-limit';

export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Max 10 upload attempts per window per IP
  message: { error: 'Too many upload attempts. Please try again after 15 minutes.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
