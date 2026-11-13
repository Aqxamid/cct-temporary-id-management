import path from "path";
import fs from "fs";
import {
  getAllStudents,
  getStudentById,
  hasSubmittedAssets,
  updateStudent,
  updateStudentOverrideEmail,
  createStudent,
  deleteStudent,
} from "../services/dbService.js";
import { populateStudentDocument } from "../services/documentService.js";
import {
  processBulkEmailQueue,
  sendStudentEmail,
} from "../services/emailService.js";
import {
  importStudentsFromFile,
  computeTemporaryExpiry,
} from "../services/studentImportService.js";
import { PUBLIC_BASE_URL } from "../config/env.js";
import { getActivityLogs, recordActivity } from "../services/logService.js";

function actor(req) {
  return req.admin?.username || "system";
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || "";
}

export function getDashboard(req, res) {
  res.sendFile(path.join(process.cwd(), "src", "views", "adminDashboard.html"));
}

export function listStudents(req, res) {
  res.set("Cache-Control", "no-store");
  const students = getAllStudents();
  res.json(students);
}

export function listActivityLogs(req, res) {
  res.set("Cache-Control", "no-store");
  res.json(getActivityLogs(req.query.limit));
}

export function getStudent(req, res) {
  const { studentId } = req.params;
  const student = getStudentById(studentId);
  if (!student) return res.status(404).json({ error: "Student not found." });
  if (!hasSubmittedAssets(student)) {
    return res
      .status(409)
      .json({
        error:
          "This student is reference data only and has not submitted a temporary ID request.",
      });
  }
  res.json(student);
}

export async function approveStudent(req, res) {
  const { studentId } = req.params;
  const student = getStudentById(studentId);
  if (!student) return res.status(404).json({ error: "Student not found." });
  if (
    student.approvalStatus !== "PENDING_REVIEW" ||
    student.renewalStatus === "RENEWAL_REQUESTED"
  ) {
    return res
      .status(400)
      .json({ error: "Only submissions pending review can be approved." });
  }

  const updated = updateStudent(studentId, {
    approvalStatus: "APPROVED",
    emailStatus: "READY_TO_SEND",
  });

  recordActivity({
    action: "STUDENT_APPROVED",
    category: "approval",
    description: `Approved temporary ID submission of ${student.fullName} (${studentId}).`,
    studentId,
    admin: actor(req),
    ip: clientIp(req),
  });

  res.json({ success: true, student: updated });
}

export async function rejectStudent(req, res) {
  const { studentId } = req.params;
  const { reason } = req.body;
  const student = getStudentById(studentId);
  if (!student) return res.status(404).json({ error: "Student not found." });
  if (
    student.approvalStatus !== "PENDING_REVIEW" ||
    student.renewalStatus === "RENEWAL_REQUESTED"
  ) {
    return res
      .status(400)
      .json({ error: "Only submissions pending review can be rejected." });
  }

  const updated = updateStudent(studentId, {
    approvalStatus: "REJECTED",
    rejectionReason: reason || "",
    emailStatus: "NOT_READY",
  });

  recordActivity({
    action: "STUDENT_REJECTED",
    category: "approval",
    description: `Rejected temporary ID submission of ${student.fullName} (${studentId}).`,
    studentId,
    admin: actor(req),
    ip: clientIp(req),
    status: "warning",
    details: reason ? `Reason: ${reason}` : "",
  });

  res.json({ success: true, student: updated });
}

export async function bulkApproveStudents(req, res) {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: "studentIds array required." });
  }

  const results = [];
  for (const id of studentIds) {
    const student = getStudentById(id);
    if (!student) {
      results.push({ studentId: id, error: "Not found" });
      continue;
    }
    if (
      student.approvalStatus !== "PENDING_REVIEW" ||
      student.renewalStatus === "RENEWAL_REQUESTED"
    ) {
      results.push({
        studentId: id,
        error: "Only submissions pending review can be approved.",
      });
      continue;
    }
    const updated = updateStudent(id, {
      approvalStatus: "APPROVED",
      emailStatus: "READY_TO_SEND",
    });
    results.push({ studentId: id, success: true, student: updated });
  }

  const approved = results.filter((result) => result.success);
  if (approved.length > 0) {
    recordActivity({
      action: "STUDENTS_BULK_APPROVED",
      category: "approval",
      description: `Bulk approved ${approved.length} temporary ID submission(s).`,
      admin: actor(req),
      ip: clientIp(req),
      details: approved.map((result) => result.studentId).join(", "),
    });
  }

  res.json({ success: results.every((result) => result.success), results });
}

export async function updateRecipientEmail(req, res) {
  const { studentId, overrideEmail } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(overrideEmail)) {
    return res.status(400).json({ error: "Invalid email address format." });
  }

  const updated = updateStudentOverrideEmail(studentId, overrideEmail);
  if (!updated) return res.status(404).json({ error: "Student not found." });

  recordActivity({
    action: "RECIPIENT_EMAIL_UPDATED",
    category: "student",
    description: `Updated recipient email for ${updated.fullName} (${studentId}) to ${overrideEmail}.`,
    studentId,
    admin: actor(req),
    ip: clientIp(req),
  });

  res.json({
    success: true,
    message: `Recipient email updated to ${overrideEmail}`,
  });
}

export async function downloadStudentDocument(req, res) {
  const { studentId } = req.params;
  const student = getStudentById(studentId);

  if (!student) return res.status(404).json({ error: "Student not found." });
  if (!hasSubmittedAssets(student)) {
    return res
      .status(409)
      .json({
        error: "This student has not submitted a photo and signature yet.",
      });
  }

  const publicBaseUrl =
    PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

  try {
    const pdfPath = await populateStudentDocument(student, publicBaseUrl);
    updateStudent(studentId, { pdfPath, emailStatus: "READY_TO_SEND" });

    recordActivity({
      action: "DOCUMENT_GENERATED",
      category: "document",
      description: `Generated temporary ID PDF for ${student.fullName} (${studentId}).`,
      studentId,
      admin: actor(req),
      ip: clientIp(req),
    });

    res.download(pdfPath, `Temporary_ID_${studentId}.pdf`, (err) => {
      if (err && !res.headersSent)
        res.status(500).json({ error: "Error downloading document." });
    });
  } catch (err) {
    console.error("Document generation error:", err);
    recordActivity({
      action: "DOCUMENT_GENERATION_FAILED",
      category: "document",
      description: `Failed to generate temporary ID PDF for ${studentId}.`,
      studentId,
      admin: actor(req),
      ip: clientIp(req),
      status: "error",
      details: err.message,
    });
    res
      .status(500)
      .json({ error: `Document generation failed: ${err.message}` });
  }
}

export async function processRenewals(req, res) {
  const { studentIds, extensionDays = 30 } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: "studentIds array required." });
  }

  const days = Number(extensionDays);
  if (!Number.isInteger(days) || days <= 0 || days > 3650) {
    return res
      .status(400)
      .json({ error: "extensionDays must be a positive whole number." });
  }

  const results = [];

  for (const id of studentIds) {
    const student = getStudentById(id);
    if (!student) {
      results.push({ studentId: id, error: "Not found" });
      continue;
    }

    if (student.renewalStatus !== "RENEWAL_REQUESTED") {
      results.push({
        studentId: id,
        error: "Student has no pending renewal request.",
      });
      continue;
    }

    const currentExpiry = new Date(student.temporaryExpiryDate);
    if (Number.isNaN(currentExpiry.getTime())) {
      results.push({ studentId: id, error: "Current expiry date is invalid." });
      continue;
    }
    currentExpiry.setDate(currentExpiry.getDate() + days);
    const newExpiryDate = currentExpiry.toISOString().split("T")[0];

    const updated = updateStudent(id, {
      temporaryExpiryDate: newExpiryDate,
      renewalStatus: "RENEWAL_APPROVED",
      approvalStatus: "APPROVED",
      // Force a fresh PDF before this renewed ID can be emailed.
      pdfPath: "",
      emailStatus: "NOT_READY",
    });

    if (updated) {
      recordActivity({
        action: "RENEWAL_APPROVED",
        category: "renewal",
        description: `Approved renewal for ${student.fullName} (${id}); new expiry ${newExpiryDate}.`,
        studentId: id,
        admin: actor(req),
        ip: clientIp(req),
        details: `Extended by ${days} day(s).`,
      });
    }

    results.push({ studentId: id, newExpiryDate, success: Boolean(updated) });
  }

  const failed = results.filter((result) => !result.success);
  res.json({
    success: failed.length === 0,
    message: failed.length
      ? "Some renewals could not be processed."
      : `Renewed ${studentIds.length} ID(s).`,
    results,
  });
}

// Students that still need a document generated or an email sent. Anything
// already emailed (emailStatus SENT) is excluded so the bulk action never
// regenerates or re-sends an ID that is already done.
function getPendingApprovedStudents() {
  return getAllStudents().filter(
    (s) =>
      s.approvalStatus === "APPROVED" &&
      s.renewalStatus !== "RENEWAL_REQUESTED" &&
      s.emailStatus !== "SENT" &&
      hasSubmittedAssets(s),
  );
}

function getEmailableStudents() {
  return getPendingApprovedStudents().filter(
    (s) => s.emailStatus === "READY_TO_SEND" && s.pdfPath && fs.existsSync(s.pdfPath),
  );
}

/**
 * Generates the temporary ID PDF for every approved student that does not have
 * a current document yet, so the "Send approved IDs" action always has
 * something to email. Streams NDJSON progress events.
 */
export async function generateApprovedDocuments(req, res) {
  const approved = getPendingApprovedStudents();

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (payload) => {
    if (!res.writableEnded) res.write(`${JSON.stringify(payload)}\n`);
  };

  if (approved.length === 0) {
    send({
      type: "done",
      success: true,
      message: "There are no approved IDs to generate.",
      results: { generated: 0, failed: 0, errors: [] },
    });
    return res.end();
  }

  send({ type: "start", total: approved.length });

  const publicBaseUrl = PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const results = { generated: 0, failed: 0, errors: [] };
  let processed = 0;

  for (const student of approved) {
    try {
      const pdfPath = await populateStudentDocument(student, publicBaseUrl);
      updateStudent(student.studentId, { pdfPath, emailStatus: "READY_TO_SEND" });
      results.generated += 1;
      processed += 1;
      send({
        type: "progress",
        processed,
        total: approved.length,
        studentId: student.studentId,
        studentName: student.fullName,
        status: "GENERATED",
      });
    } catch (error) {
      results.failed += 1;
      results.errors.push({ studentId: student.studentId, error: error.message });
      processed += 1;
      send({
        type: "progress",
        processed,
        total: approved.length,
        studentId: student.studentId,
        studentName: student.fullName,
        status: "FAILED",
        error: error.message,
      });
    }
  }

  recordActivity({
    action: "DOCUMENTS_GENERATED",
    category: "document",
    description: `Generated ${results.generated} approved temporary ID document(s); ${results.failed} failed.`,
    admin: actor(req),
    ip: clientIp(req),
    status: results.failed > 0 ? "warning" : "success",
    details: results.errors.length ? JSON.stringify(results.errors) : "",
  });

  send({ type: "done", success: results.failed === 0, results });
  res.end();
}

/**
 * Streams newline-delimited JSON progress events so the dashboard can show a
 * live progress bar while emails are being dispatched.
 */
export async function sendApprovedEmails(req, res) {
  const approved = getEmailableStudents();

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (payload) => {
    if (!res.writableEnded) res.write(`${JSON.stringify(payload)}\n`);
  };

  if (approved.length === 0) {
    send({
      type: "done",
      success: true,
      message: "No approved students ready to email.",
      results: { success: 0, failed: 0, errors: [] },
    });
    return res.end();
  }

  send({ type: "start", total: approved.length });

  let processed = 0;
  const results = await processBulkEmailQueue(approved, (id, status, error) => {
    updateStudent(id, { emailStatus: status === "SENT" ? "SENT" : "FAILED" });
    processed += 1;
    const student = approved.find((item) => item.studentId === id);
    send({
      type: "progress",
      processed,
      total: approved.length,
      studentId: id,
      studentName: student?.fullName || "",
      status,
      error: error || "",
    });
  });

  recordActivity({
    action: "EMAILS_DISPATCHED",
    category: "email",
    description: `Dispatched ${approved.length} approved temporary ID email(s): ${results.success} sent, ${results.failed} failed.`,
    admin: actor(req),
    ip: clientIp(req),
    status: results.failed > 0 ? "warning" : "success",
    details: results.errors?.length ? JSON.stringify(results.errors) : "",
  });

  send({ type: "done", success: true, results });
  res.end();
}

export async function sendSingleEmail(req, res) {
  const { studentId } = req.params;
  const student = getStudentById(studentId);

  if (!student) return res.status(404).json({ error: "Student not found." });
  if (student.approvalStatus !== "APPROVED") {
    return res
      .status(400)
      .json({ error: "Only approved students can be emailed." });
  }
  if (!student.pdfPath || !fs.existsSync(student.pdfPath)) {
    return res
      .status(400)
      .json({
        error:
          "No current document generated yet. Download the document first.",
      });
  }

  try {
    const sentTo = await sendStudentEmail(student);
    updateStudent(studentId, { emailStatus: "SENT" });
    recordActivity({
      action: "EMAIL_SENT",
      category: "email",
      description: `Sent temporary ID email for ${student.fullName} (${studentId}) to ${sentTo}.`,
      studentId,
      admin: actor(req),
      ip: clientIp(req),
    });
    res.json({ success: true, message: `Email sent to ${sentTo}` });
  } catch (err) {
    updateStudent(studentId, { emailStatus: "FAILED" });
    recordActivity({
      action: "EMAIL_FAILED",
      category: "email",
      description: `Failed to send temporary ID email for ${student.fullName} (${studentId}).`,
      studentId,
      admin: actor(req),
      ip: clientIp(req),
      status: "error",
      details: err.message,
    });
    res.status(500).json({ error: `Email failed: ${err.message}` });
  }
}

export function addStudent(req, res) {
  const data = req.body;

  if (!data.studentId || !data.fullName || !data.email) {
    return res
      .status(400)
      .json({ error: "studentId, fullName and email are required." });
  }
  if (getStudentById(data.studentId)) {
    return res
      .status(409)
      .json({ error: "A student with this ID already exists." });
  }

  const generatedDate = new Date().toISOString().split("T")[0];
  const student = {
    studentId: data.studentId,
    fullName: data.fullName,
    dob: data.dob || "",
    email: data.email,
    overrideEmail: "",
    enrollmentStatus: data.enrollmentStatus || "Enrolled",
    course: data.course || "",
    programStartDate: data.programStartDate || "",
    // Expiry is always computed by the system: one year of validity.
    temporaryExpiryDate: computeTemporaryExpiry(generatedDate),
    guardianName: data.guardianName || "",
    address: data.address || "",
    phone: data.phone || "",
    generatedDate,
    uploadToken: `token-${Date.now()}`,
    renewalToken: `renew-${Date.now()}`,
    photoUrl: "",
    signatureUrl: "",
    qrCodeUrl: "",
    renewalQrUrl: "",
    pdfPath: "",
    approvalStatus: "PENDING_UPLOAD",
    renewalStatus: "NONE",
    emailStatus: "NOT_READY",
    initials: data.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    tone: ["coral", "blue", "plum", "sage", "gold", "lavender"][
      Math.floor(Math.random() * 6)
    ],
  };

  const created = createStudent(student);

  recordActivity({
    action: "STUDENT_CREATED",
    category: "student",
    description: `Created student record for ${student.fullName} (${student.studentId}).`,
    studentId: student.studentId,
    admin: actor(req),
    ip: clientIp(req),
  });

  res.json({ success: true, student: created });
}

export function importStudents(req, res) {
  if (!req.file?.buffer) {
    return res
      .status(400)
      .json({ error: "Please choose a CSV file to import." });
  }

  try {
    const result = importStudentsFromFile(req.file.buffer);

    recordActivity({
      action: "STUDENTS_IMPORTED",
      category: "import",
      description: `Imported ${result.imported} student(s) from CSV; skipped ${result.skipped} duplicate(s) and ${result.invalid} invalid row(s).`,
      admin: actor(req),
      ip: clientIp(req),
      status: result.invalid > 0 ? "warning" : "success",
      details: result.invalidRecords?.length
        ? JSON.stringify(result.invalidRecords)
        : "",
    });

    res.json({
      success: true,
      message: `Imported ${result.imported} student(s). Skipped ${result.skipped} duplicate(s) and found ${result.invalid} invalid row(s).`,
      ...result,
    });
  } catch (error) {
    recordActivity({
      action: "STUDENT_IMPORT_FAILED",
      category: "import",
      description: "CSV student import failed.",
      admin: actor(req),
      ip: clientIp(req),
      status: "error",
      details: error.message,
    });
    res.status(400).json({ error: error.message || "Student import failed." });
  }
}

export function removeStudent(req, res) {
  const { studentId } = req.params;
  const student = getStudentById(studentId);
  deleteStudent(studentId);

  recordActivity({
    action: "STUDENT_DELETED",
    category: "student",
    description:
      `Deleted student record ${student?.fullName || ""} (${studentId}).`.replace(
        "  ",
        " ",
      ),
    studentId,
    admin: actor(req),
    ip: clientIp(req),
    status: "warning",
  });

  res.json({ success: true });
}
