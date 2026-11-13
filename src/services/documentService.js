import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import jwt from 'jsonwebtoken';
import { generateStudentQR } from './qrService.js';
import { JWT_SECRET } from '../config/env.js';

const docsDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

export async function populateStudentDocument(studentData, publicBaseUrl) {
  // 1. Generate QRs if not already present
  if (!studentData.qrCodeUrl || !studentData.renewalQrUrl) {
    const { generateRenewalQR } = await import('./qrService.js');
    const qrRelativePath = await generateStudentQR(studentData.studentId);
    const renewalQrPath = await generateRenewalQR(
      studentData.studentId,
      studentData.renewalToken,
      publicBaseUrl
    );
    
    studentData.qrCodeUrl = qrRelativePath;
    studentData.renewalQrUrl = renewalQrPath;
    
    // Save both to DB
    const db = await import('./dbService.js');
    db.updateStudent(studentData.studentId, { 
      qrCodeUrl: qrRelativePath,
      renewalQrUrl: renewalQrPath
    });
  }

  // 2. Mint a short-lived admin token so Puppeteer can hit the protected API
  const secret = JWT_SECRET || 'super_secret_intranet_key_2026';
  const tempToken = jwt.sign({ adminId: 'SYSTEM', role: 'REGISTRAR_ADMIN' }, secret, {
    expiresIn: '2m',
  });

  const idCardUrl = `${publicBaseUrl}/id-card/${encodeURIComponent(studentData.studentId)}`;

  // 3. Launch headless browser & render the ID card page
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Set the auth cookie so the API call inside the page succeeds
    await page.setCookie({
      name: 'admin_session',
      value: tempToken,
      domain: 'localhost',
      httpOnly: true,
    });

    // Navigate and wait for the card data to fully load
    await page.goto(idCardUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for the name to be populated (not "Loading…")
    await page.waitForFunction(
      () => {
        const el = document.getElementById('cardName');
        return el && el.textContent.trim() !== '—' && el.textContent.trim() !== '';
      },
      { timeout: 10000 }
    );

    const outputPath = path.join(docsDir, `ID_${studentData.studentId}.pdf`);
    await page.pdf({
      path: outputPath,
      printBackground: true,
      width: '8.5in',
      height: '11in',
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });

    return outputPath;
  } finally {
    await browser.close();
  }
}
