import { createTransporter } from '../config/smtp.js';

function resolveRecipient(student) {
  return student.overrideEmail && student.overrideEmail.trim() !== ''
    ? student.overrideEmail
    : student.email;
}

function buildEmailHtml(student, targetEmail) {
  return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background: #172235; padding: 20px; border-radius: 6px 6px 0 0; margin: -20px -20px 20px;">
        <h1 style="color: #fff; margin: 0; font-size: 20px;">City College of Tagaytay</h1>
        <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px;">Temporary ID Admin — MIS Office</p>
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
        📱 <strong>Scan the QR code</strong> embedded on your ID card to request an extension before it expires.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 11px; color: #94a3b8;">This email was sent to: ${targetEmail}</p>
      <p style="font-size: 11px; color: #94a3b8;">City College of Tagaytay — MIS Office</p>
    </div>
  `;
}

export async function sendStudentEmail(student) {
  const transporter = createTransporter();
  const targetEmail = resolveRecipient(student);

  const mailOptions = {
    from: `"City College of Tagaytay MIS" <${process.env.SMTP_USER}>`,
    to: targetEmail,
    subject: `Temporary Student ID — ${student.fullName} (${student.studentId})`,
    html: buildEmailHtml(student, targetEmail),
    attachments: student.pdfPath
      ? [{ filename: `Temp_ID_${student.studentId}.docx`, path: student.pdfPath }]
      : [],
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
