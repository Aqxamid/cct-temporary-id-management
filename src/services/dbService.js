import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'students.json');

function ensureDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
  }
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
