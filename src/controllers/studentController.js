import path from "path";
import fs from "fs";
import {
  getStudentByToken,
  updateStudent,
  getStudentById,
  hasSubmittedAssets,
} from "../services/dbService.js";
import { recordActivity } from "../services/logService.js";
import { SUBMISSION_COMPLETE_REDIRECT_URL } from "../config/env.js";

function removeStoredAsset(relativeUrl, directory, keepPath = "") {
  if (!relativeUrl) return;

  const root = path.resolve(directory);
  const target = path.resolve(process.cwd(), relativeUrl);
  const keep = keepPath ? path.resolve(keepPath) : "";
  const isInsideDirectory =
    target === root || target.startsWith(`${root}${path.sep}`);

  if (isInsideDirectory && target !== keep && fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}

function cleanText(value, maxLength = 200) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

// Base64 payloads are ~33% larger than the decoded file, so a 5 MB photo
// arrives as roughly 6.7 MB of text. Reject oversized payloads with a clear
// message instead of letting the database throw a raw "field value too long".
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_SIGNATURE_BYTES = 5 * 1024 * 1024;

function decodedBase64Size(dataUrl) {
  const base64 = String(dataUrl || "").replace(/^data:image\/[\w.+-]+;base64,/, "");
  const padding = (base64.match(/=+$/) || [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

// Expiry dates are stored as ISO calendar dates (YYYY-MM-DD). Keep the
// displayed expiry date valid through that day and redirect starting the next
// day. Using the same UTC date format as the import service keeps the check
// consistent with the value saved in SQLite.
function isTemporaryIdExpired(student) {
  const expiryDate = String(student?.temporaryExpiryDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) return false;

  const today = new Date().toISOString().split("T")[0];
  return today > expiryDate;
}

function renewalUrlFor(student) {
  if (!student?.studentId || !student?.renewalToken) return "";

  const params = new URLSearchParams({
    studentId: String(student.studentId),
    token: String(student.renewalToken),
  });
  return `/api/renew?${params.toString()}`;
}

function isApprovedTemporaryId(student) {
  return student?.approvalStatus === "APPROVED";
}

function isSubmissionLocked(student) {
  if (!student || student.approvalStatus === "REJECTED") return false;

  return (
    student.approvalStatus === "PENDING_REVIEW" ||
    student.approvalStatus === "APPROVED" ||
    hasSubmittedAssets(student)
  );
}

function submissionLockedResponse(res) {
  return res.status(409).json({
    error:
      "Your submission has already been received and is locked. Please contact the MIS Office if you need to make a correction.",
  });
}

export function ensureSubmissionOpen(req, res, next) {
  const student = getStudentByToken(req.params.token);

  if (!student) {
    return res.status(404).json({ error: "Invalid or expired upload token." });
  }

  if (isSubmissionLocked(student)) return submissionLockedResponse(res);

  next();
}

export async function getPublicEntryPage(req, res) {
  res.sendFile(path.join(process.cwd(), "src", "views", "studentLogin.html"));
}

export async function lookupStudent(req, res) {
  const { studentId } = req.body;
  if (!studentId) {
    return res.status(400).json({ error: "Student ID is required." });
  }

  const student = getStudentById(studentId.trim());
  if (!student) {
    return res.status(404).json({ error: "Student ID not found." });
  }

  res.json({ success: true, redirectUrl: `/upload/${student.uploadToken}` });
}

export async function getUploadPage(req, res) {
  const { token } = req.params;
  const student = getStudentByToken(token);

  res.set("Cache-Control", "no-store");

  if (!student) {
    return res.status(404).send(`
      <!DOCTYPE html><html><head><title>Invalid Link</title>
      <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f7f8fa;margin:0;}
      .card{background:#fff;border-radius:12px;padding:40px;text-align:center;border:1px solid #e5e7eb;max-width:400px;}
      h2{color:#172235;margin:0 0 10px;} p{color:#64748b;}</style></head>
      <body><div class="card"><h2>Invalid or Expired Link</h2><p>This upload link is no longer valid. Please contact [mis@citycollegeoftagaytay.edu.ph] for a new link.</p></div></body></html>
    `);
  }

  if (isApprovedTemporaryId(student) && isTemporaryIdExpired(student)) {
    const renewalUrl = renewalUrlFor(student);
    if (renewalUrl) return res.redirect(renewalUrl);
  }

  if (isSubmissionLocked(student)) {
    return res.redirect(SUBMISSION_COMPLETE_REDIRECT_URL);
  }

  res.sendFile(path.join(process.cwd(), "src", "views", "studentUpload.html"));
}

export async function getStudentData(req, res) {
  const { token } = req.params;
  const student = getStudentByToken(token);

  if (!student) {
    return res.status(404).json({ error: "Invalid or expired token." });
  }

  // Return safe subset
  res.json({
    studentId: student.studentId,
    fullName: student.fullName,
    dob: student.dob,
    course: student.course,
    enrollmentStatus: student.enrollmentStatus,
    programStartDate: student.programStartDate,
    temporaryExpiryDate: student.temporaryExpiryDate,
    guardianName: student.guardianName,
    address: student.address,
    phone: student.phone,
    approvalStatus: student.approvalStatus,
  });
}

export async function handleAssetUpload(req, res) {
  const { token } = req.params;
  const student = getStudentByToken(token);

  if (!student) {
    return res.status(404).json({ error: "Invalid or expired upload token." });
  }

  if (isSubmissionLocked(student)) return submissionLockedResponse(res);

  const updates = {};
  const photoDir = path.join(process.cwd(), "uploads", "photos");
  const sigDir = path.join(process.cwd(), "uploads", "signatures");
  const studentPhotoPath = path.join(photoDir, `${student.studentId}.png`);
  const studentSignaturePath = path.join(sigDir, `${student.studentId}.png`);

  if (req.files?.photo?.[0]) {
    removeStoredAsset(student.photoUrl, photoDir, req.files.photo[0].path);
    updates.photoUrl = `uploads/photos/${path.basename(req.files.photo[0].path)}`;
  }

  if (req.files?.signature?.[0]) {
    removeStoredAsset(
      student.signatureUrl,
      sigDir,
      req.files.signature[0].path,
    );
    updates.signatureUrl = `uploads/signatures/${path.basename(req.files.signature[0].path)}`;
  }

  // Handle base64 signature from canvas
  if (req.body.signatureData) {
    const signatureBytes = decodedBase64Size(req.body.signatureData);
    if (signatureBytes > MAX_SIGNATURE_BYTES) {
      return res.status(413).json({
        error: `Your signature image is too large (${formatBytes(signatureBytes)}). The maximum allowed size is ${formatBytes(MAX_SIGNATURE_BYTES)}. Please upload a smaller image or draw your signature instead.`,
      });
    }
    const sigData = req.body.signatureData.replace(
      /^data:image\/\w+;base64,/,
      "",
    );
    const sigBuf = Buffer.from(sigData, "base64");
    if (!fs.existsSync(sigDir)) fs.mkdirSync(sigDir, { recursive: true });
    removeStoredAsset(student.signatureUrl, sigDir, studentSignaturePath);
    if (req.files?.signature?.[0]) {
      removeStoredAsset(
        `uploads/signatures/${path.basename(req.files.signature[0].path)}`,
        sigDir,
        studentSignaturePath,
      );
    }
    fs.writeFileSync(studentSignaturePath, sigBuf);
    updates.signatureUrl = `uploads/signatures/${student.studentId}.png`;
  }

  // Handle base64 photo from camera
  if (req.body.photoData) {
    const photoBytes = decodedBase64Size(req.body.photoData);
    if (photoBytes > MAX_PHOTO_BYTES) {
      return res.status(413).json({
        error: `Your photo is too large (${formatBytes(photoBytes)}). The maximum allowed size is ${formatBytes(MAX_PHOTO_BYTES)}. Please compress or resize the image and try again.`,
      });
    }
    const photoData = req.body.photoData.replace(
      /^data:image\/\w+;base64,/,
      "",
    );
    const photoBuf = Buffer.from(photoData, "base64");
    if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });
    removeStoredAsset(student.photoUrl, photoDir, studentPhotoPath);
    if (req.files?.photo?.[0]) {
      removeStoredAsset(
        `uploads/photos/${path.basename(req.files.photo[0].path)}`,
        photoDir,
        studentPhotoPath,
      );
    }
    fs.writeFileSync(studentPhotoPath, photoBuf);
    updates.photoUrl = `uploads/photos/${student.studentId}.png`;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No assets received." });
  }

  // Guardian / emergency contact details are collected from the student
  // because they are not part of the imported reference data.
  const guardianName = cleanText(req.body.guardianName, 120);
  const address = cleanText(req.body.address, 300);
  const phone = cleanText(req.body.phone, 30);

  if (!guardianName) {
    return res.status(400).json({ error: "Guardian name is required." });
  }
  if (!address) {
    return res.status(400).json({ error: "Home address is required." });
  }
  if (!phone) {
    return res
      .status(400)
      .json({ error: "Guardian contact number is required." });
  }
  if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) {
    return res
      .status(400)
      .json({ error: "Guardian contact number is invalid." });
  }

  updates.guardianName = guardianName;
  updates.address = address;
  updates.phone = phone;
  updates.approvalStatus = "PENDING_REVIEW";
  updates.rejectionReason = "";

  let updated;
  try {
    updated = updateStudent(student.studentId, updates);
  } catch (error) {
    console.error("Student submission save failed:", error);
    return res.status(500).json({
      error: "We could not save your submission. Please try again with a smaller photo or signature image.",
    });
  }

  recordActivity({
    action: "STUDENT_SUBMISSION_RECEIVED",
    category: "submission",
    description: `${student.fullName} (${student.studentId}) submitted photo, signature and guardian details.`,
    studentId: student.studentId,
    ip: req.ip || "",
  });

  res.json({
    success: true,
    message: "Assets submitted successfully. Awaiting admin review.",
    studentId: updated.studentId,
    redirectUrl: SUBMISSION_COMPLETE_REDIRECT_URL,
  });
}
