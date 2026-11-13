import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getStudentByToken } from '../services/dbService.js';

const photosDir = path.join(process.cwd(), 'uploads', 'photos');
const signaturesDir = path.join(process.cwd(), 'uploads', 'signatures');

[photosDir, signaturesDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (file.fieldname === 'photo') {
      cb(null, photosDir);
    } else if (file.fieldname === 'signature') {
      cb(null, signaturesDir);
    } else {
      cb(new Error('Unknown field'), null);
    }
  },
  filename(req, file, cb) {
    const token = req.params.token || 'unknown';
    const student = getStudentByToken(token);
    const studentId = student?.studentId || token;
    const safeStudentId = String(studentId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = (path.extname(file.originalname) || '.png').toLowerCase();
    cb(null, `${safeStudentId}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed.'), false);
  }
};

// The student portal sends the photo and signature as base64 data URLs in
// regular form fields (photoData / signatureData), not as file parts. Multer
// caps non-file fields at 1 MB by default, which produced a raw
// "Field value too long" error for any normal-sized photo. Allow enough room
// for a 5 MB image (~6.7 MB once base64-encoded) plus the text fields.
export const uploadFields = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per uploaded file
    fieldSize: 8 * 1024 * 1024, // 8MB per text field (base64 image payloads)
    fields: 20,
  },
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
]);

export const idTemplateUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'public', 'images')),
    filename: (req, file, cb) => {
      if (file.fieldname === 'templateFront') cb(null, 'id_template_front.jpeg');
      else if (file.fieldname === 'templateBack') cb(null, 'id_template_back.jpeg');
      else cb(null, file.originalname);
    }
  }),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
}).fields([
  { name: 'templateFront', maxCount: 1 },
  { name: 'templateBack', maxCount: 1 }
]);

export const presidentSignatureUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'public', 'images')),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `president_signature${ext}`);
    }
  }),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('presidentSignature');

// Student bulk-import files are kept in memory because they are parsed
// immediately and should never be stored in the uploads directory.
// CSV is the only supported import format.
export const studentImportUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const allowedExtensions = ['.csv'];
    const allowedMimeTypes = [
      'text/csv',
      'application/csv',
      'text/plain',
      'application/vnd.ms-excel',
    ];

    if (allowedExtensions.includes(extension) || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed. Export your spreadsheet as CSV and try again.'), false);
    }
  },
});
