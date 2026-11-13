import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

const qrDir = path.join(process.cwd(), 'uploads', 'qrcodes');
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

function safeStudentId(studentId) {
  return String(studentId).replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function generateStudentQR(studentId) {
  const filename = `${safeStudentId(studentId)}.png`;
  const outputPath = path.join(qrDir, filename);

  // QR encodes the student ID number so scanning reveals their student number
  await QRCode.toFile(outputPath, studentId, {
    width: 300,
    margin: 1,
    color: { dark: '#172235', light: '#FFFFFF' },
  });

  return `uploads/qrcodes/${filename}`;
}

export async function generateRenewalQR(studentId, renewalToken, publicBaseUrl) {
  const renewalUrl = `${publicBaseUrl}/api/renew?studentId=${encodeURIComponent(studentId)}&token=${renewalToken}`;
  const filename = `${safeStudentId(studentId)}_renewal.png`;
  const outputPath = path.join(qrDir, filename);

  // QR encodes the renewal link
  await QRCode.toFile(outputPath, renewalUrl, {
    width: 300,
    margin: 1,
    color: { dark: '#172235', light: '#FFFFFF' },
  });

  return `uploads/qrcodes/${filename}`;
}
