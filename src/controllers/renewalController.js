import { getStudentById, getStudentByRenewalToken, updateStudent } from '../services/dbService.js';

export async function requestRenewal(req, res) {
  const { studentId, token } = req.query;

  if (!studentId || !token) {
    return res.status(400).send(`
      <!DOCTYPE html><html><head><title>Invalid Request</title>
      <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f7f8fa;margin:0;}
      .card{background:#fff;border-radius:12px;padding:40px;text-align:center;border:1px solid #e5e7eb;max-width:420px;}
      h2{color:#172235;margin:0 0 10px;} p{color:#64748b;}</style></head>
      <body><div class="card"><h2>Invalid Request</h2><p>Missing required parameters. Please scan your QR code again.</p></div></body></html>
    `);
  }

  const student = getStudentById(studentId);

  if (!student || student.renewalToken !== token) {
    return res.status(403).send(`
      <!DOCTYPE html><html><head><title>Invalid Token</title>
      <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f7f8fa;margin:0;}
      .card{background:#fff;border-radius:12px;padding:40px;text-align:center;border:1px solid #e5e7eb;max-width:420px;}
      h2{color:#d73925;margin:0 0 10px;} p{color:#64748b;}</style></head>
      <body><div class="card"><h2>Invalid or Expired Token</h2><p>This renewal link is no longer valid.</p></div></body></html>
    `);
  }

  if (student.renewalStatus === 'RENEWAL_REQUESTED') {
    return res.send(`
      <!DOCTYPE html><html><head><title>Already Requested</title>
      <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f7f8fa;margin:0;}
      .card{background:#fff;border-radius:12px;padding:40px;text-align:center;border:1px solid #e5e7eb;max-width:420px;}
      h2{color:#f59e0b;margin:0 0 10px;} p{color:#64748b;} .badge{background:#fff6e2;color:#c37b08;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;display:inline-block;margin-bottom:16px;}</style></head>
      <body><div class="card"><span class="badge">PENDING REVIEW</span><h2>Renewal Already Requested</h2><p>Your renewal request for <strong>${student.fullName}</strong> (${student.studentId}) is already pending review by the MIS.</p></div></body></html>
    `);
  }

  updateStudent(studentId, { renewalStatus: 'RENEWAL_REQUESTED' });

  res.send(`
    <!DOCTYPE html><html><head><title>Renewal Requested</title>
    <style>body{font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f7f8fa;margin:0;}
    .card{background:#fff;border-radius:12px;padding:40px;text-align:center;border:1px solid #e5e7eb;max-width:420px;box-shadow:0 4px 20px rgba(0,0,0,.08);}
    h2{color:#172235;margin:0 0 10px;} p{color:#64748b;font-size:13px;line-height:1.6;}
    .badge{background:#e7f8f1;color:#07966b;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;display:inline-block;margin-bottom:16px;}
    .info{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:20px 0;text-align:left;}
    .info div{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;}
    .info span{color:#64748b;} .info strong{color:#172235;}</style></head>
    <body><div class="card">
      <span class="badge">✓ RENEWAL SUBMITTED</span>
      <h2>Renewal Request Sent</h2>
      <p>Your request to extend your temporary student ID has been submitted to the MIS Office for review.</p>
      <div class="info">
        <div><span>Student</span><strong>${student.fullName}</strong></div>
        <div><span>ID Number</span><strong>${student.studentId}</strong></div>
        <div><span>Current Expiry</span><strong>${student.temporaryExpiryDate}</strong></div>
      </div>
      <p>You will be notified via email once your renewal has been processed.</p>
    </div></body></html>
  `);
}
