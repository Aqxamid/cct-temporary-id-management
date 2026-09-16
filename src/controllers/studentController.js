import path from 'path';
import fs from 'fs';
import { getStudentByToken, updateStudent, getStudentById } from '../services/dbService.js';

function removeStoredAsset(relativeUrl, directory, keepPath = '') {
  if (!relativeUrl) return;

  const root = path.resolve(directory);
  const target = path.resolve(process.cwd(), relativeUrl);
  const keep = keepPath ? path.resolve(keepPath) : '';
  const isInsideDirectory = target === root || target.startsWith(`${root}${path.sep}`);

  if (isInsideDirectory && target !== keep && fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}

export async function getPublicEntryPage(req, res) {
  res.sendFile(path.join(process.cwd(), 'src', 'views', 'studentLogin.html'));
}

export async function lookupStudent(req, res) {
  const { studentId } = req.body;
  if (!studentId) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  const student = getStudentById(studentId.trim());
  if (!student) {
    return res.status(404).json({ error: 'Student ID not found.' });
  }

  res.json({ success: true, redirectUrl: `/upload/${student.uploadToken}` });
}

export async function getUploadPage(req, res) {
  const { token } = req.params;
  const student = getStudentByToken(token);

  if (!student) {
    return res.status(404).send(`
      <!DOCTYPE html><html><head><title>Invalid Link</title>
      <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f7f8fa;margin:0;}
      .card{background:#fff;border-radius:12px;padding:40px;text-align:center;border:1px solid #e5e7eb;max-width:400px;}
      h2{color:#172235;margin:0 0 10px;} p{color:#64748b;}</style></head>
      <body><div class="card"><h2>Invalid or Expired Link</h2><p>This upload link is no longer valid. Please contact [mis@citycollegeoftagaytay.edu.ph] for a new link.</p></div></body></html>
    `);
  }

  res.sendFile(path.join(process.cwd(), 'src', 'views', 'studentUpload.html'));
}

export async function getStudentData(req, res) {
  const { token } = req.params;
  const student = getStudentByToken(token);

  if (!student) {
    return res.status(404).json({ error: 'Invalid or expired token.' });
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
    approvalStatus: student.approvalStatus,
  });
}

export async function handleAssetUpload(req, res) {
  const { token } = req.params;
  const student = getStudentByToken(token);

  if (!student) {
    return res.status(404).json({ error: 'Invalid or expired upload token.' });
  }

  const updates = {};
  const photoDir = path.join(process.cwd(), 'uploads', 'photos');
  const sigDir = path.join(process.cwd(), 'uploads', 'signatures');
  const studentPhotoPath = path.join(photoDir, `${student.studentId}.png`);
  const studentSignaturePath = path.join(sigDir, `${student.studentId}.png`);

  if (req.files?.photo?.[0]) {
    removeStoredAsset(student.photoUrl, photoDir, req.files.photo[0].path);
    updates.photoUrl = `uploads/photos/${path.basename(req.files.photo[0].path)}`;
  }

  if (req.files?.signature?.[0]) {
    removeStoredAsset(student.signatureUrl, sigDir, req.files.signature[0].path);
    updates.signatureUrl = `uploads/signatures/${path.basename(req.files.signature[0].path)}`;
  }

  // Handle base64 signature from canvas
  if (req.body.signatureData) {
    const sigData = req.body.signatureData.replace(/^data:image\/\w+;base64,/, '');
    const sigBuf = Buffer.from(sigData, 'base64');
    if (!fs.existsSync(sigDir)) fs.mkdirSync(sigDir, { recursive: true });
    removeStoredAsset(student.signatureUrl, sigDir, studentSignaturePath);
    if (req.files?.signature?.[0]) {
      removeStoredAsset(`uploads/signatures/${path.basename(req.files.signature[0].path)}`, sigDir, studentSignaturePath);
    }
    fs.writeFileSync(studentSignaturePath, sigBuf);
    updates.signatureUrl = `uploads/signatures/${student.studentId}.png`;
  }

  // Handle base64 photo from camera
  if (req.body.photoData) {
    const photoData = req.body.photoData.replace(/^data:image\/\w+;base64,/, '');
    const photoBuf = Buffer.from(photoData, 'base64');
    if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });
    removeStoredAsset(student.photoUrl, photoDir, studentPhotoPath);
    if (req.files?.photo?.[0]) {
      removeStoredAsset(`uploads/photos/${path.basename(req.files.photo[0].path)}`, photoDir, studentPhotoPath);
    }
    fs.writeFileSync(studentPhotoPath, photoBuf);
    updates.photoUrl = `uploads/photos/${student.studentId}.png`;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No assets received.' });
  }

  updates.approvalStatus = 'PENDING_REVIEW';
  updates.rejectionReason = '';
  const updated = updateStudent(student.studentId, updates);

  res.json({
    success: true,
    message: 'Assets submitted successfully. Awaiting admin review.',
    studentId: updated.studentId,
  });
}
