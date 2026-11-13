import { db, nowIso } from "./db.js";

// ----------------------------------------------------
// Student records
// ----------------------------------------------------

const STUDENT_COLUMNS = {
  studentId: "student_id",
  fullName: "full_name",
  dob: "dob",
  email: "email",
  overrideEmail: "override_email",
  enrollmentStatus: "enrollment_status",
  course: "course",
  programStartDate: "program_start_date",
  temporaryExpiryDate: "temporary_expiry_date",
  guardianName: "guardian_name",
  address: "address",
  phone: "phone",
  generatedDate: "generated_date",
  uploadToken: "upload_token",
  renewalToken: "renewal_token",
  photoUrl: "photo_url",
  signatureUrl: "signature_url",
  qrCodeUrl: "qr_code_url",
  renewalQrUrl: "renewal_qr_url",
  pdfPath: "pdf_path",
  approvalStatus: "approval_status",
  renewalStatus: "renewal_status",
  emailStatus: "email_status",
  rejectionReason: "rejection_reason",
  initials: "initials",
  tone: "tone",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

const COLUMN_TO_FIELD = Object.fromEntries(
  Object.entries(STUDENT_COLUMNS).map(([field, column]) => [column, field]),
);

function rowToStudent(row) {
  if (!row) return null;
  return Object.entries(row).reduce((student, [column, value]) => {
    const field = COLUMN_TO_FIELD[column];
    if (field) student[field] = value ?? "";
    return student;
  }, {});
}

function studentToRow(student) {
  const row = {};
  for (const [field, column] of Object.entries(STUDENT_COLUMNS)) {
    if (student[field] !== undefined) row[column] = student[field] ?? "";
  }
  return row;
}

export function getAllStudents() {
  return db
    .prepare("SELECT * FROM students ORDER BY created_at ASC, rowid ASC")
    .all()
    .map(rowToStudent);
}

export function getStudentById(studentId) {
  return rowToStudent(
    db
      .prepare("SELECT * FROM students WHERE student_id = ?")
      .get(String(studentId)),
  );
}

export function getStudentByToken(token) {
  return rowToStudent(
    db
      .prepare("SELECT * FROM students WHERE upload_token = ?")
      .get(String(token)),
  );
}

export function hasSubmittedAssets(student) {
  return Boolean(student?.photoUrl && student?.signatureUrl);
}

export function updateStudent(studentId, updates) {
  const existing = getStudentById(studentId);
  if (!existing) return null;

  const row = studentToRow({ ...updates, updatedAt: nowIso() });
  const columns = Object.keys(row);
  if (columns.length === 0) return existing;

  const assignments = columns.map((column) => `${column} = ?`).join(", ");
  db.prepare(`UPDATE students SET ${assignments} WHERE student_id = ?`).run(
    ...columns.map((column) => row[column]),
    String(studentId),
  );

  return getStudentById(studentId);
}

export function updateStudentOverrideEmail(studentId, overrideEmail) {
  return updateStudent(studentId, { overrideEmail });
}



export function createStudent(studentData) {
  const timestamp = nowIso();
  const record = {
    ...studentData,
    createdAt: studentData.createdAt || timestamp,
    updatedAt: studentData.updatedAt || timestamp,
  };
  const row = studentToRow(record);
  const columns = Object.keys(row);
  db.prepare(
    `INSERT INTO students (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
  ).run(...columns.map((column) => row[column]));
  return getStudentById(record.studentId);
}

export function createStudents(studentData) {
  if (!Array.isArray(studentData) || studentData.length === 0) return [];
  const timestamp = nowIso();
  const created = [];

  db.exec("BEGIN");
  try {
    for (const student of studentData) {
      created.push(
        createStudent({
          ...student,
          createdAt: student.createdAt || timestamp,
          updatedAt: student.updatedAt || timestamp,
        }),
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return created;
}

export function deleteStudent(studentId) {
  db.prepare("DELETE FROM students WHERE student_id = ?").run(
    String(studentId),
  );
}

// ----------------------------------------------------
// Admin management
// ----------------------------------------------------

export function getAdminByUsername(username) {
  const row = db
    .prepare("SELECT * FROM admins WHERE username = ?")
    .get(String(username));
  if (!row) return null;
  return {
    adminId: row.admin_id,
    username: row.username,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function createAdmin({
  adminId,
  username,
  passwordHash,
  fullName,
  role = "MIS_ADMIN",
  createdAt,
}) {
  db.prepare(
    `
    INSERT INTO admins (admin_id, username, password_hash, full_name, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(adminId, username, passwordHash, fullName, role, createdAt || nowIso());
}
