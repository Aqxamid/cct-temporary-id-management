import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'students.json');

function ensureDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(getSeedData(), null, 2));
  }
}

function getSeedData() {
  return [
    {
      studentId: '2026-CCT-0142',
      fullName: 'Amelia Carter',
      dob: '2004-05-18',
      email: 'amelia.carter@citycollegeoftagaytay.edu.ph',
      overrideEmail: '',
      enrollmentStatus: 'Enrolled',
      course: 'BSc Computer Science',
      programStartDate: '2026-08-15',
      temporaryExpiryDate: '2026-11-15',
      guardianName: 'Margaret Carter',
      address: 'Manila, Metro Manila',
      phone: '+63 912 345 6789',
      generatedDate: '2026-09-16',
      uploadToken: 'token-amelia-001',
      renewalToken: 'renew-amelia-001',
      photoUrl: '',
      signatureUrl: '',
      qrCodeUrl: '',
      pdfPath: '',
      approvalStatus: 'PENDING_REVIEW',
      renewalStatus: 'NONE',
      emailStatus: 'NOT_READY',
      initials: 'AC',
      tone: 'coral',
    },
    {
      studentId: '2026-CCT-0201',
      fullName: 'Jordan Williams',
      dob: '2003-11-22',
      email: 'jordan.williams@citycollegeoftagaytay.edu.ph',
      overrideEmail: '',
      enrollmentStatus: 'Enrolled',
      course: 'BA Business Management',
      programStartDate: '2026-08-15',
      temporaryExpiryDate: '2026-11-15',
      guardianName: 'Thomas Williams',
      address: 'Quezon City, Metro Manila',
      phone: '+63 917 234 5678',
      generatedDate: '2026-09-16',
      uploadToken: 'token-jordan-002',
      renewalToken: 'renew-jordan-002',
      photoUrl: '',
      signatureUrl: '',
      qrCodeUrl: '',
      pdfPath: '',
      approvalStatus: 'PENDING_REVIEW',
      renewalStatus: 'NONE',
      emailStatus: 'NOT_READY',
      initials: 'JW',
      tone: 'blue',
    },
    {
      studentId: '2026-CCT-0876',
      fullName: 'Sofia Martinez',
      dob: '2002-07-09',
      email: 'sofia.martinez@citycollegeoftagaytay.edu.ph',
      overrideEmail: 'sofia.personal@gmail.com',
      enrollmentStatus: 'Enrolled',
      course: 'MSc Data Analytics',
      programStartDate: '2026-08-15',
      temporaryExpiryDate: '2026-10-15',
      guardianName: 'Carlos Martinez',
      address: 'Makati, Metro Manila',
      phone: '+63 918 123 4567',
      generatedDate: '2026-09-10',
      uploadToken: 'token-sofia-003',
      renewalToken: 'renew-sofia-003',
      photoUrl: '',
      signatureUrl: '',
      qrCodeUrl: '',
      pdfPath: '',
      approvalStatus: 'PENDING_REVIEW',
      renewalStatus: 'RENEWAL_REQUESTED',
      emailStatus: 'NOT_READY',
      initials: 'SM',
      tone: 'plum',
    },
    {
      studentId: '2026-CCT-0055',
      fullName: 'Noah Patel',
      dob: '2003-03-14',
      email: 'noah.patel@citycollegeoftagaytay.edu.ph',
      overrideEmail: '',
      enrollmentStatus: 'Enrolled',
      course: 'BA Architecture',
      programStartDate: '2026-08-15',
      temporaryExpiryDate: '2026-11-15',
      guardianName: 'Priya Patel',
      address: 'Taguig, Metro Manila',
      phone: '+63 919 876 5432',
      generatedDate: '2026-09-16',
      uploadToken: 'token-noah-004',
      renewalToken: 'renew-noah-004',
      photoUrl: '',
      signatureUrl: '',
      qrCodeUrl: '',
      pdfPath: '',
      approvalStatus: 'PENDING_REVIEW',
      renewalStatus: 'NONE',
      emailStatus: 'NOT_READY',
      initials: 'NP',
      tone: 'sage',
    },
    {
      studentId: '2026-CCT-0998',
      fullName: 'Liam Okafor',
      dob: '2003-09-27',
      email: 'liam.okafor@citycollegeoftagaytay.edu.ph',
      overrideEmail: '',
      enrollmentStatus: 'Enrolled',
      course: 'BEng Mechanical Engineering',
      programStartDate: '2026-08-15',
      temporaryExpiryDate: '2026-12-01',
      guardianName: 'Emeka Okafor',
      address: 'Pasig, Metro Manila',
      phone: '+63 920 654 3210',
      generatedDate: '2026-09-16',
      uploadToken: 'token-liam-005',
      renewalToken: 'renew-liam-005',
      photoUrl: '',
      signatureUrl: '',
      qrCodeUrl: '',
      pdfPath: '',
      approvalStatus: 'APPROVED',
      renewalStatus: 'NONE',
      emailStatus: 'SENT',
      initials: 'LO',
      tone: 'gold',
    },
    {
      studentId: '2026-CCT-0941',
      fullName: 'Grace Kim',
      dob: '2004-01-05',
      email: 'grace.kim@citycollegeoftagaytay.edu.ph',
      overrideEmail: '',
      enrollmentStatus: 'Enrolled',
      course: 'LLB Law',
      programStartDate: '2026-08-15',
      temporaryExpiryDate: '2026-11-15',
      guardianName: 'Sun-Young Kim',
      address: 'San Juan, Metro Manila',
      phone: '+63 921 987 6543',
      generatedDate: '2026-09-16',
      uploadToken: 'token-grace-006',
      renewalToken: 'renew-grace-006',
      photoUrl: '',
      signatureUrl: '',
      qrCodeUrl: '',
      pdfPath: '',
      approvalStatus: 'PENDING_REVIEW',
      renewalStatus: 'NONE',
      emailStatus: 'NOT_READY',
      initials: 'GK',
      tone: 'lavender',
    },
    {
      studentId: '2023011846',
      fullName: 'Allen Ronn Parado',
      dob: '2005-02-02',
      email: 'allen.parado@citycollegeoftagaytay.edu.ph',
      overrideEmail: '',
      enrollmentStatus: 'Enrolled',
      course: 'BSIT',
      programStartDate: '2023-08-15',
      temporaryExpiryDate: '2026-12-31',
      guardianName: 'Guardian Parado',
      address: 'brgy. buklod bahayan tartaria silang cavite',
      phone: '09123456789',
      generatedDate: '2026-09-16',
      uploadToken: 'token-allen-007',
      renewalToken: 'renew-allen-007',
      photoUrl: '',
      signatureUrl: '',
      qrCodeUrl: '',
      pdfPath: '',
      approvalStatus: 'PENDING_REVIEW',
      renewalStatus: 'NONE',
      emailStatus: 'NOT_READY',
      initials: 'AP',
      tone: 'coral',
    },
  ];
}

function readDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function getAllStudents() {
  return readDB();
}

export function getStudentById(studentId) {
  const students = readDB();
  return students.find(s => s.studentId === studentId) || null;
}

export function getStudentByToken(token) {
  const students = readDB();
  return students.find(s => s.uploadToken === token) || null;
}

export function getStudentByRenewalToken(token) {
  const students = readDB();
  return students.find(s => s.renewalToken === token) || null;
}

export function updateStudent(studentId, updates) {
  const students = readDB();
  const idx = students.findIndex(s => s.studentId === studentId);
  if (idx === -1) return null;
  students[idx] = { ...students[idx], ...updates };
  writeDB(students);
  return students[idx];
}

export function updateStudentOverrideEmail(studentId, overrideEmail) {
  return updateStudent(studentId, { overrideEmail });
}

export function updateStudentExpiry(studentId, newExpiryDate) {
  return updateStudent(studentId, { temporaryExpiryDate: newExpiryDate });
}

export function createStudent(studentData) {
  const students = readDB();
  students.push(studentData);
  writeDB(students);
  return studentData;
}

export function deleteStudent(studentId) {
  const students = readDB();
  const filtered = students.filter(s => s.studentId !== studentId);
  writeDB(filtered);
}

// ----------------------------------------------------
// Admin Management
// ----------------------------------------------------

const ADMIN_DB_PATH = path.join(process.cwd(), 'data', 'admins.json');

function ensureAdminDB() {
  const dir = path.dirname(ADMIN_DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ADMIN_DB_PATH)) {
    fs.writeFileSync(ADMIN_DB_PATH, JSON.stringify([], null, 2));
  }
}

function readAdminDB() {
  ensureAdminDB();
  return JSON.parse(fs.readFileSync(ADMIN_DB_PATH, 'utf-8'));
}

export function getAdminByUsername(username) {
  const admins = readAdminDB();
  return admins.find(a => a.username === username) || null;
}
