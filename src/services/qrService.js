import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

const qrDir = path.join(process.cwd(), 'uploads', 'qrcodes');
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

export async function generateStudentQR(studentId, renewalToken, publicBaseUrl) {
  const renewalUrl = `${publicBaseUrl}/api/renew?studentId=${encodeURIComponent(studentId)}&token=${renewalToken}`;
  const outputPath = path.join(qrDir, `${studentId}.png`);

  await QRCode.toFile(outputPath, renewalUrl, {
    width: 300,
    margin: 1,
    color: { dark: '#172235', light: '#FFFFFF' },
  });

  return `uploads/qrcodes/${studentId}.png`;
}
