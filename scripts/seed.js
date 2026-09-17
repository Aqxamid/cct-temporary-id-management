import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDirectory = path.resolve(process.env.SEED_DATA_DIR || path.join(projectRoot, 'data'));
const adminsPath = path.join(dataDirectory, 'admins.json');
const studentsPath = path.join(dataDirectory, 'students.json');

const seedAdmin = {
  adminId: 'ADM-SEED-001',
  username: process.env.SEED_ADMIN_USERNAME || 'sample_admin',
  fullName: 'Sample Administrator',
  role: 'MIS_ADMIN',
  createdAt: '2026-09-17T00:00:00.000Z',
};

const seedStudent = {
  studentId: '2026019999',
  fullName: 'Sample Student',
  dob: '2005-06-20',
  email: 'sample.student@example.com',
  overrideEmail: '',
  enrollmentStatus: 'Enrolled',
  course: 'BSIT',
  programStartDate: '2026-08-15',
  temporaryExpiryDate: '2027-03-01',
  guardianName: 'Sample Guardian',
  address: 'Tagaytay City, Cavite',
  phone: '09123456789',
  generatedDate: '2026-09-17',
  uploadToken: 'token-seed-2026019999',
  renewalToken: 'renew-seed-2026019999',
  photoUrl: '',
  signatureUrl: '',
  qrCodeUrl: '',
  renewalQrUrl: '',
  pdfPath: '',
  approvalStatus: 'PENDING_UPLOAD',
  renewalStatus: 'NONE',
  emailStatus: 'NOT_READY',
  initials: 'SS',
  tone: 'sage',
};

function readArray(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(value)) {
    throw new Error(`${filePath} must contain a JSON array.`);
  }
  return value;
}

function writeArray(filePath, records) {
  fs.writeFileSync(filePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

async function seed() {
  fs.mkdirSync(dataDirectory, { recursive: true });

  const admins = readArray(adminsPath);
  const students = readArray(studentsPath);
  const adminExists = admins.some(admin =>
    admin.username === seedAdmin.username || admin.adminId === seedAdmin.adminId
  );
  const studentExists = students.some(student => student.studentId === seedStudent.studentId);

  if (!adminExists) {
    const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
    admins.push({
      ...seedAdmin,
      passwordHash: await bcrypt.hash(password, 10),
    });
    writeArray(adminsPath, admins);
    console.log(`Seeded admin: ${seedAdmin.username}`);
  } else {
    console.log(`Admin already exists: ${seedAdmin.username}`);
  }

  if (!studentExists) {
    students.push(seedStudent);
    writeArray(studentsPath, students);
    console.log(`Seeded student: ${seedStudent.studentId}`);
  } else {
    console.log(`Student already exists: ${seedStudent.studentId}`);
  }

  console.log(`Seed data directory: ${dataDirectory}`);
}

seed().catch(error => {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
});
