import crypto from 'crypto';
import { createStudents, getAllStudents } from './dbService.js';

const MAX_RECORDS = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TONES = ['coral', 'blue', 'plum', 'sage', 'gold', 'lavender'];

function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function cleanValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some(value => cleanValue(value) !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some(value => cleanValue(value) !== '')) rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows.shift().map(normalizeHeader);
  if (!headers.some(Boolean)) throw new Error('CSV file must contain a header row.');

  return rows.map(values => headers.reduce((record, header, index) => {
    if (header) record[header] = cleanValue(values[index]);
    return record;
  }, {}));
}

function normalizeJsonRecords(parsed) {
  const records = Array.isArray(parsed) ? parsed : parsed?.students;
  if (!Array.isArray(records)) {
    throw new Error('JSON must contain an array of students or a {"students": [...]} object.');
  }

  return records.map(record => Object.entries(record || {}).reduce((normalized, [key, value]) => {
    normalized[normalizeHeader(key)] = cleanValue(value);
    return normalized;
  }, {}));
}

export function parseStudentImport(buffer, extension) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');

  if (extension === '.json') {
    try {
      return normalizeJsonRecords(JSON.parse(text));
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('The JSON file is not valid.');
      throw error;
    }
  }

  return parseCsv(text);
}

function valueFor(record, ...keys) {
  for (const key of keys) {
    if (record[key] !== undefined) return cleanValue(record[key]);
  }
  return '';
}

function buildStudentRecord(record, usedTokens) {
  let uploadToken;
  let renewalToken;

  do {
    uploadToken = `token-${crypto.randomUUID()}`;
  } while (usedTokens.has(uploadToken));
  usedTokens.add(uploadToken);

  do {
    renewalToken = `renew-${crypto.randomUUID()}`;
  } while (usedTokens.has(renewalToken));
  usedTokens.add(renewalToken);

  const fullName = valueFor(record, 'fullname', 'name');

  return {
    studentId: valueFor(record, 'studentid'),
    fullName,
    dob: valueFor(record, 'dob', 'dateofbirth'),
    email: valueFor(record, 'email'),
    overrideEmail: '',
    enrollmentStatus: valueFor(record, 'enrollmentstatus') || 'Enrolled',
    course: valueFor(record, 'course', 'program'),
    programStartDate: valueFor(record, 'programstartdate'),
    temporaryExpiryDate: valueFor(record, 'temporaryexpirydate', 'expirydate'),
    guardianName: valueFor(record, 'guardianname'),
    address: valueFor(record, 'address'),
    phone: valueFor(record, 'phone', 'phonenumber'),
    generatedDate: new Date().toISOString().split('T')[0],
    uploadToken,
    renewalToken,
    photoUrl: '',
    signatureUrl: '',
    qrCodeUrl: '',
    renewalQrUrl: '',
    pdfPath: '',
    approvalStatus: 'PENDING_UPLOAD',
    renewalStatus: 'NONE',
    emailStatus: 'NOT_READY',
    initials: fullName.split(/\s+/).filter(Boolean).map(name => name[0]).join('').slice(0, 2).toUpperCase(),
    tone: TONES[Math.floor(Math.random() * TONES.length)],
  };
}

export function importStudentsFromFile(buffer, extension) {
  const records = parseStudentImport(buffer, extension);
  if (records.length === 0) throw new Error('The import file contains no student records.');
  if (records.length > MAX_RECORDS) throw new Error(`Import is limited to ${MAX_RECORDS} student records per file.`);

  const existingStudents = getAllStudents();
  const existingIds = new Set(existingStudents.map(student => String(student.studentId).trim()));
  const usedTokens = new Set(existingStudents.flatMap(student => [student.uploadToken, student.renewalToken].filter(Boolean)));
  const imported = [];
  const skipped = [];
  const invalid = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const studentId = valueFor(record, 'studentid');
    const fullName = valueFor(record, 'fullname', 'name');
    const email = valueFor(record, 'email');

    if (existingIds.has(studentId)) {
      skipped.push({ row: rowNumber, studentId, reason: 'Student ID already exists.' });
      return;
    }

    const errors = [];
    if (!studentId) errors.push('studentId is required.');
    if (!fullName) errors.push('fullName is required.');
    if (!email) errors.push('email is required.');
    else if (!EMAIL_PATTERN.test(email)) errors.push('email is invalid.');

    if (errors.length > 0) {
      invalid.push({ row: rowNumber, studentId, errors });
      return;
    }

    if (existingIds.has(studentId)) {
      skipped.push({ row: rowNumber, studentId, reason: 'Duplicate student ID in file.' });
      return;
    }

    const student = buildStudentRecord(record, usedTokens);
    imported.push(student);
    existingIds.add(studentId);
  });

  createStudents(imported);

  return {
    imported: imported.length,
    skipped: skipped.length,
    invalid: invalid.length,
    importedStudentIds: imported.map(student => student.studentId),
    skippedRecords: skipped,
    invalidRecords: invalid,
  };
}
