import crypto from "crypto";
import { createStudents, getAllStudents } from "./dbService.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TONES = ["coral", "blue", "plum", "sage", "gold", "lavender"];

// Temporary IDs are valid for one year from the day they are generated.
export const TEMPORARY_ID_VALIDITY_YEARS = 1;

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cleanValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
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
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => cleanValue(value) !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((value) => cleanValue(value) !== "")) rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows.shift().map(normalizeHeader);
  if (!headers.some(Boolean))
    throw new Error("CSV file must contain a header row.");

  return rows.map((values) =>
    headers.reduce((record, header, index) => {
      if (header) record[header] = cleanValue(values[index]);
      return record;
    }, {}),
  );
}

export function parseStudentImport(buffer) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  return parseCsv(text);
}

function valueFor(record, ...keys) {
  for (const key of keys) {
    if (record[key] !== undefined) return cleanValue(record[key]);
  }
  return "";
}

/**
 * Computes the temporary ID expiry: exactly one year after the generation date.
 * The expiry is never taken from the import file.
 */
export function computeTemporaryExpiry(generatedDate = new Date()) {
  const date =
    generatedDate instanceof Date
      ? new Date(generatedDate.getTime())
      : new Date(generatedDate);
  if (Number.isNaN(date.getTime())) return "";
  date.setFullYear(date.getFullYear() + TEMPORARY_ID_VALIDITY_YEARS);
  return date.toISOString().split("T")[0];
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

  const fullName = valueFor(record, "fullname", "name");
  const generatedDate = new Date().toISOString().split("T")[0];

  return {
    studentId: valueFor(record, "studentid"),
    fullName,
    dob: valueFor(record, "dob", "dateofbirth"),
    email: valueFor(record, "email"),
    overrideEmail: "",
    enrollmentStatus: valueFor(record, "enrollmentstatus") || "Enrolled",
    course: valueFor(record, "course", "program"),
    programStartDate: valueFor(record, "programstartdate"),
    temporaryExpiryDate: computeTemporaryExpiry(generatedDate),
    guardianName: valueFor(record, "guardianname"),
    address: valueFor(record, "address"),
    phone: valueFor(record, "phone", "phonenumber"),
    generatedDate,
    uploadToken,
    renewalToken,
    photoUrl: "",
    signatureUrl: "",
    qrCodeUrl: "",
    renewalQrUrl: "",
    pdfPath: "",
    approvalStatus: "PENDING_UPLOAD",
    renewalStatus: "NONE",
    emailStatus: "NOT_READY",
    initials: fullName
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    tone: TONES[Math.floor(Math.random() * TONES.length)],
  };
}

export function importStudentsFromFile(buffer) {
  const records = parseStudentImport(buffer);
  if (records.length === 0)
    throw new Error("The import file contains no student records.");

  const existingStudents = getAllStudents();
  const existingIds = new Set(
    existingStudents.map((student) => String(student.studentId).trim()),
  );
  const usedTokens = new Set(
    existingStudents.flatMap((student) =>
      [student.uploadToken, student.renewalToken].filter(Boolean),
    ),
  );
  const imported = [];
  const skipped = [];
  const invalid = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const studentId = valueFor(record, "studentid");
    const fullName = valueFor(record, "fullname", "name");
    const email = valueFor(record, "email");

    if (existingIds.has(studentId)) {
      skipped.push({
        row: rowNumber,
        studentId,
        reason: "Student ID already exists.",
      });
      return;
    }

    const errors = [];
    if (!studentId) errors.push("studentId is required.");
    if (!fullName) errors.push("fullName is required.");
    if (!email) errors.push("email is required.");
    else if (!EMAIL_PATTERN.test(email)) errors.push("email is invalid.");

    if (errors.length > 0) {
      invalid.push({ row: rowNumber, studentId, errors });
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
    importedStudentIds: imported.map((student) => student.studentId),
    skippedRecords: skipped,
    invalidRecords: invalid,
  };
}
