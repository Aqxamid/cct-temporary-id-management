import { Router } from "express";
import fs from "fs";
import path from "path";
import { getSettings, saveSettings } from "../services/settingsService.js";
import { saveSignatureDataUrl } from "../services/signatureService.js";
import { recordActivity } from "../services/logService.js";
import {
  idTemplateUpload,
  presidentSignatureUpload,
  studentImportUpload,
} from "../middleware/upload.js";
import {
  getDashboard,
  listStudents,
  getStudent,
  approveStudent,
  rejectStudent,
  bulkApproveStudents,
  updateRecipientEmail,
  downloadStudentDocument,
  processRenewals,
  sendApprovedEmails,
  generateApprovedDocuments,
  sendSingleEmail,
  addStudent,
  importStudents,
  removeStudent,
  listActivityLogs,
} from "../controllers/adminController.js";

const router = Router();

function actor(req) {
  return req.admin?.username || "system";
}

// Note: intranetOnly middleware is applied in server.js for all /admin routes
// but can also be applied here per-route

// Dashboard HTML page
router.get("/", getDashboard);
router.get("/dashboard", getDashboard);

// Student CRUD API
router.get("/api/students", listStudents);
router.get("/api/logs", listActivityLogs);
router.get("/api/students/:studentId", getStudent);
router.post("/api/students", addStudent);
router.delete("/api/students/:studentId", removeStudent);

router.post(
  "/api/students/import",
  (req, res, next) => {
    studentImportUpload.single("file")(req, res, (error) => {
      if (error)
        return res
          .status(400)
          .json({ error: error.message || "Import file upload failed." });
      next();
    });
  },
  importStudents,
);

// Bulk approve — MUST be before /:studentId to avoid route collision
router.post("/api/students/bulk-approve", bulkApproveStudents);

// Individual student actions
router.post("/api/students/:studentId/approve", approveStudent);
router.post("/api/students/:studentId/reject", rejectStudent);
router.post("/api/students/:studentId/download", downloadStudentDocument);
router.get("/api/students/:studentId/download", downloadStudentDocument);
router.post("/api/students/:studentId/email", sendSingleEmail);

// Bulk actions
router.post("/api/email/override", updateRecipientEmail);
router.post("/api/email/send-approved", sendApprovedEmails);
router.post("/api/documents/generate-approved", generateApprovedDocuments);
router.post("/api/renewals/process", processRenewals);

// Logged-in admin info
router.get("/api/me", (req, res) => {
  res.json({
    adminId: req.admin.adminId,
    fullName: req.admin.fullName || "MIS Administrator",
    role: req.admin.role,
  });
});

// Settings (signer name/role etc.)
router.get("/api/settings", (req, res) => {
  res.json(getSettings());
});
router.patch("/api/settings", (req, res) => {
  const updated = saveSettings(req.body);
  recordActivity({
    action: "SETTINGS_UPDATED",
    category: "settings",
    description: "Updated global signatory settings.",
    admin: actor(req),
    ip: req.ip || "",
    details: Object.keys(req.body || {}).join(", "),
  });
  res.json({ success: true, settings: updated });
});

router.post("/api/settings/id-template", idTemplateUpload, (req, res) => {
  recordActivity({
    action: "ID_TEMPLATE_UPDATED",
    category: "settings",
    description: "Uploaded new ID card template image(s).",
    admin: actor(req),
    ip: req.ip || "",
  });
  res.json({ success: true, message: "Templates updated" });
});

router.post(
  "/api/settings/president-signature",
  presidentSignatureUpload,
  (req, res) => {
    try {
      const signatureDir = path.join(process.cwd(), "public", "images");
      const transparentPath = path.join(
        signatureDir,
        "president_signature.png",
      );
      const previousSignatureUrl = getSettings().presidentSignatureUrl;

      if (req.body?.presidentSignatureData) {
        saveSignatureDataUrl(req.body.presidentSignatureData, transparentPath);
      } else if (req.file) {
        // Keep backwards compatibility for older clients. New clients send a
        // transparent PNG data URL after processing the image in the editor.
        fs.copyFileSync(req.file.path, transparentPath);
      } else {
        return res.status(400).json({ error: "No signature image uploaded." });
      }

      if (previousSignatureUrl) {
        const previousPath = path.resolve(process.cwd(), previousSignatureUrl);
        const imageRoot = path.resolve(signatureDir);
        if (
          previousPath.startsWith(`${imageRoot}${path.sep}`) &&
          previousPath !== transparentPath &&
          fs.existsSync(previousPath)
        ) {
          fs.unlinkSync(previousPath);
        }
      }

      // Remove legacy copies left by earlier JPG/JPEG upload versions.
      for (const extension of ["jpg", "jpeg", "webp", "gif"]) {
        const legacyPath = path.join(
          signatureDir,
          `president_signature.${extension}`,
        );
        if (legacyPath !== transparentPath && fs.existsSync(legacyPath))
          fs.unlinkSync(legacyPath);
      }

      const updated = saveSettings({
        presidentSignatureUrl: "public/images/president_signature.png",
      });
      recordActivity({
        action: "PRESIDENT_SIGNATURE_UPDATED",
        category: "settings",
        description: "Updated the College President e-signature.",
        admin: actor(req),
        ip: req.ip || "",
      });
      res.json({ success: true, settings: updated });
    } catch (err) {
      res
        .status(400)
        .json({ error: err.message || "Could not save signature." });
    }
  },
);

export default router;
