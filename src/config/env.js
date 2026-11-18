import 'dotenv/config';

export const PORT = process.env.PORT || 3000;
export const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
export const SMTP_USER = process.env.SMTP_USER || '';
export const SMTP_PASS = process.env.SMTP_PASS || '';
export const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || 'smtp').trim().toLowerCase();
export const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
export const BREVO_API_URL = process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';
export const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || SMTP_USER;
export const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'City College of Tagaytay MIS';
export const BREVO_REPLY_TO_EMAIL = process.env.BREVO_REPLY_TO_EMAIL || '';
export const BREVO_SANDBOX = (process.env.BREVO_SANDBOX || '').trim().toLowerCase() === 'true';
export const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
export const EMAIL_BANNER_URL = process.env.EMAIL_BANNER_URL || '';
export const SUBMISSION_COMPLETE_REDIRECT_URL =
  process.env.SUBMISSION_COMPLETE_REDIRECT_URL || 'https://www.google.com/';

// JWT_SECRET must be set via environment variable in production.
// A weak fallback is used only so the server boots in development;
// it will log a loud warning so it is never silently used in prod.
const _JWT_FALLBACK = 'super_secret_intranet_key_2026';
export const JWT_SECRET = process.env.JWT_SECRET || _JWT_FALLBACK;

if (!process.env.JWT_SECRET) {
  console.warn(
    '\n⚠️  WARNING: JWT_SECRET is not set in .env — using an insecure default key.\n' +
    '   Set a strong, random JWT_SECRET in your .env before deploying to production.\n'
  );
}
