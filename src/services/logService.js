import { db, nowIso } from "./db.js";

const MAX_LOG_ENTRIES = 5000;

/**
 * Records a system interaction (approval, rejection, import, email dispatch,
 * document generation, settings change, student submission, ...).
 * Request-level traffic is intentionally NOT logged.
 */
export function recordActivity({
  action,
  category = "system",
  description = "",
  studentId = "",
  admin = "",
  ip = "",
  status = "success",
  details = "",
}) {
  try {
    db.prepare(
      `
      INSERT INTO activity_logs (timestamp, action, category, description, student_id, admin, ip, status, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      nowIso(),
      String(action || "UNKNOWN"),
      String(category || "system"),
      String(description || ""),
      String(studentId || ""),
      String(admin || ""),
      String(ip || ""),
      String(status || "success"),
      typeof details === "string" ? details : JSON.stringify(details || ""),
    );

    // Keep the table bounded so the lightweight database does not grow forever.
    db.prepare(
      `
      DELETE FROM activity_logs
      WHERE id NOT IN (SELECT id FROM activity_logs ORDER BY id DESC LIMIT ?)
    `,
    ).run(MAX_LOG_ENTRIES);
  } catch (error) {
    // Logging must never break a request or hide the original application error.
    console.error("Could not write activity log:", error.message);
  }
}

export function getActivityLogs(limit = 250) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 250, 1),
    MAX_LOG_ENTRIES,
  );
  return db
    .prepare("SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?")
    .all(safeLimit)
    .map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      action: row.action,
      category: row.category,
      description: row.description,
      studentId: row.student_id,
      admin: row.admin,
      ip: row.ip,
      status: row.status,
      details: row.details,
    }));
}
