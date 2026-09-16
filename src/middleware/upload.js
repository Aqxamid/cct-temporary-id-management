import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${token}${ext}`);
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

export const uploadFields = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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
