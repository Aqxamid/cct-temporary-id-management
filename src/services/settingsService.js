import { db } from "./db.js";

const DEFAULT_SETTINGS = {
  authorizedSignerName: "Joel Mari J. Alcala",
  authorizedSignerRole: "MIS Officer",
  schoolName: "City College of Tagaytay",
  email: "mis@citycollegeoftagaytay.edu.ph",
  presidentName: "Celso P. De Castro",
  presidentTitle: "College President",
  presidentSignatureUrl: "",
};

export function getSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  const stored = rows.reduce((settings, row) => {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch (_) {
      settings[row.key] = row.value;
    }
    return settings;
  }, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(updates) {
  const merged = { ...getSettings(), ...updates };
  const statement = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  db.exec("BEGIN");
  try {
    for (const [key, value] of Object.entries(merged)) {
      statement.run(key, JSON.stringify(value ?? ""));
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return merged;
}
