import fs from 'fs';
import path from 'path';
import { createTransporter } from '../config/smtp.js';
import { sendBrevoEmail } from './brevoService.js';
import { EMAIL_BANNER_URL, EMAIL_PROVIDER, PUBLIC_BASE_URL } from '../config/env.js';

function resolveRecipient(student) {
  return student.overrideEmail && student.overrideEmail.trim() !== ''
    ? student.overrideEmail
    : student.email;
}

function safeFilePart(value) {
  return String(value || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getPublicBannerUrl() {
  const configuredUrl = EMAIL_BANNER_URL.trim();
  if (configuredUrl && !/localhost|127\.0\.0\.1/i.test(configuredUrl)) return configuredUrl;

  const baseUrl = PUBLIC_BASE_URL.replace(/\/+$/, '');
  if (/localhost|127\.0\.0\.1/i.test(baseUrl)) return '';
  return `${baseUrl}/public/images/mis_email_banner.png`;
}

function buildEmailHtml(student, targetEmail, bannerSource = '') {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="padding: 0; border-radius: 6px 6px 0 0; margin: -20px -20px 20px; overflow: hidden;">
        ${bannerSource ? `<img src="${bannerSource}" alt="City College of Tagaytay MIS Office" style="display: block; width: 100%; height: auto;">` : ''}
        <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px;">Temporary ID — MIS Office</p>
      </div>
      <h2 style="color: #172235; font-size: 18px;">Temporary Student Identification Document</h2>
      <p>Dear <strong>${student.fullName}</strong>,</p>
      <p style="color: #64748b; font-size: 14px;">Your temporary student ID has been approved/renewed by the MIS Office. Please find your document attached to this email.</p>
      <table style="width: 100%; margin: 20px 0; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
        <tr style="background: #f8fafc;"><td style="padding: 10px 14px; font-weight: bold; font-size: 12px; color: #475569; width: 40%;">Student ID</td><td style="padding: 10px 14px; font-size: 12px; color: #d73925; font-weight: 700;">${student.studentId}</td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; font-size: 12px; color: #475569;">Full Name</td><td style="padding: 10px 14px; font-size: 12px;">${student.fullName}</td></tr>
        <tr style="background: #f8fafc;"><td style="padding: 10px 14px; font-weight: bold; font-size: 12px; color: #475569;">Program</td><td style="padding: 10px 14px; font-size: 12px;">${student.course}</td></tr>
        <tr><td style="padding: 10px 14px; font-weight: bold; font-size: 12px; color: #475569;">Program Start</td><td style="padding: 10px 14px; font-size: 12px;">${student.programStartDate}</td></tr>
        <tr style="background: #f8fafc;"><td style="padding: 10px 14px; font-weight: bold; font-size: 12px; color: #475569;">Valid Until</td><td style="padding: 10px 14px; font-size: 12px; color: #d73925; font-weight: 700;">${student.temporaryExpiryDate}</td></tr>
      </table>
      <p style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px; font-size: 12px; color: #0369a1;">
        <strong>Once expired</strong> you can go back to MIS Office to request the id for renewal.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 11px; color: #94a3b8;">This email was sent to: ${targetEmail}</p>
      <p style="font-size: 11px; color: #94a3b8;">City College of Tagaytay — MIS Office</p>
    </div>
  `;
}

export async function sendStudentEmail(student) {
  const targetEmail = resolveRecipient(student);
  const pdfPath = student.pdfPath ? path.resolve(process.cwd(), student.pdfPath) : '';
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    throw new Error('The current temporary ID PDF does not exist. Generate the PDF before sending the email.');
  }

  const bannerPath = path.join(process.cwd(), 'public', 'images', 'mis_email_banner.png');
  const publicBannerUrl = getPublicBannerUrl();
  const bannerSource = publicBannerUrl
    || (EMAIL_PROVIDER === 'smtp' && fs.existsSync(bannerPath) ? 'cid:mis-email-banner' : '');
  const brevoSubject = `Temporary ID Request - ${student.fullName} (${student.studentId})`;
  const subject = `Temporary ID Request â€” ${student.fullName} (${student.studentId})`;
  const pdfFilename = `Temporary_ID_${safeFilePart(student.studentId)}.pdf`;
  const attachments = [
    {
      filename: pdfFilename,
      path: pdfPath,
      contentType: 'application/pdf',
      contentDisposition: 'attachment',
    },
  ];

  // Include the banner with every provider. SMTP can render it inline locally;
  // Brevo sends it as an additional downloadable image attachment.
  if (fs.existsSync(bannerPath)) {
    const inlineBanner = EMAIL_PROVIDER === 'smtp' && !publicBannerUrl;
    attachments.unshift({
      filename: 'mis_email_banner.png',
      path: bannerPath,
      contentType: 'image/png',
      ...(inlineBanner ? { cid: 'mis-email-banner', contentDisposition: 'inline' } : { contentDisposition: 'attachment' }),
    });
  }

  if (EMAIL_PROVIDER === 'brevo') {
    await sendBrevoEmail({
      targetEmail,
      recipientName: student.fullName,
      subject: brevoSubject,
      html: buildEmailHtml(student, targetEmail, bannerSource),
      attachments,
    });
    return targetEmail;
  }

  if (EMAIL_PROVIDER !== 'smtp') {
    throw new Error(`Unsupported EMAIL_PROVIDER "${EMAIL_PROVIDER}". Use "smtp" or "brevo".`);
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"City College of Tagaytay MIS" <${process.env.SMTP_USER}>`,
    to: targetEmail,
    subject: `Temporary Student ID — ${student.fullName} (${student.studentId})`,
    html: buildEmailHtml(student, targetEmail, bannerSource),
    attachments,
  };

  await transporter.sendMail(mailOptions);
  return targetEmail;
}

export async function processBulkEmailQueue(approvedStudents, onProgress) {
  const results = { success: 0, failed: 0, errors: [] };

  for (const student of approvedStudents) {
    const targetEmail = resolveRecipient(student);
    try {
      await sendStudentEmail(student);
      results.success++;
      if (onProgress) onProgress(student.studentId, 'SENT');
      // Rate-limiting: 600ms between dispatches
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (err) {
      results.failed++;
      results.errors.push({ studentId: student.studentId, error: err.message });
      if (onProgress) onProgress(student.studentId, 'FAILED', err.message);
    }
  }

  return results;
}

export async function queueEmailForDelivery(student) {
  return sendStudentEmail(student);
}
