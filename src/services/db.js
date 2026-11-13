import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

// Single lightweight SQLite database for every persisted record:
// students, admins, settings and activity logs.
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(process.cwd(), "data", "app.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    dob TEXT DEFAULT '',
    email TEXT NOT NULL,
    override_email TEXT DEFAULT '',
    enrollment_status TEXT DEFAULT 'Enrolled',
    course TEXT DEFAULT '',
    program_start_date TEXT DEFAULT '',
    temporary_expiry_date TEXT DEFAULT '',
    guardian_name TEXT DEFAULT '',
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    generated_date TEXT DEFAULT '',
    upload_token TEXT UNIQUE,
    renewal_token TEXT UNIQUE,
    photo_url TEXT DEFAULT '',
    signature_url TEXT DEFAULT '',
    qr_code_url TEXT DEFAULT '',
    renewal_qr_url TEXT DEFAULT '',
    pdf_path TEXT DEFAULT '',
    approval_status TEXT DEFAULT 'PENDING_UPLOAD',
    renewal_status TEXT DEFAULT 'NONE',
    email_status TEXT DEFAULT 'NOT_READY',
    rejection_reason TEXT DEFAULT '',
    initials TEXT DEFAULT '',
    tone TEXT DEFAULT 'coral',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_students_upload_token ON students(upload_token);
  CREATE INDEX IF NOT EXISTS idx_students_renewal_token ON students(renewal_token);

  CREATE TABLE IF NOT EXISTS admins (
    admin_id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'MIS_ADMIN',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'system',
    description TEXT NOT NULL DEFAULT '',
    student_id TEXT DEFAULT '',
    admin TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    status TEXT DEFAULT 'success',
    details TEXT DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
`);

export function nowIso() {
  return new Date().toISOString();
}
