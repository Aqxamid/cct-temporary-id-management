import fs from 'fs';
import {
  BREVO_API_KEY,
  BREVO_API_URL,
  BREVO_REPLY_TO_EMAIL,
  BREVO_SANDBOX,
  BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME,
} from '../config/env.js';

function encodeAttachment(filePath, name) {
  return {
    name,
    content: fs.readFileSync(filePath).toString('base64'),
  };
}

export async function sendBrevoEmail({ targetEmail, recipientName, subject, html, attachments = [] }) {
  if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY is not configured.');
  if (!BREVO_SENDER_EMAIL) throw new Error('BREVO_SENDER_EMAIL is not configured.');

  const body = {
    sender: {
      email: BREVO_SENDER_EMAIL,
      name: BREVO_SENDER_NAME,
    },
    to: [{ email: targetEmail, name: recipientName || undefined }],
    subject,
    htmlContent: html,
    attachment: attachments.map(({ path: filePath, filename }) => encodeAttachment(filePath, filename)),
  };

  if (BREVO_REPLY_TO_EMAIL) {
    body.replyTo = { email: BREVO_REPLY_TO_EMAIL };
  }

  const headers = {
    accept: 'application/json',
    'api-key': BREVO_API_KEY,
    'content-type': 'application/json',
  };
  if (BREVO_SANDBOX) headers['X-Sib-Sandbox'] = 'drop';

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  let responseBody = {};
  try {
    responseBody = responseText ? JSON.parse(responseText) : {};
  } catch (_) {
    responseBody = { message: responseText };
  }

  if (!response.ok) {
    const message = responseBody.message || responseBody.code || 'Brevo rejected the email request.';
    throw new Error(`Brevo API error (${response.status}): ${message}`);
  }

  return responseBody;
}
