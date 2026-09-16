import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json');

function ensureSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    const defaults = {
      authorizedSignerName: 'Joel Mari J. Alcala',
      authorizedSignerRole: 'MIS Officer',
      schoolName: 'City College of Tagaytay',
      email: 'mis@citycollegeoftagaytay.edu.ph',
      presidentName: 'Celso P. De Castro',
      presidentTitle: 'College President',
      presidentSignatureUrl: ''
    };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, 2));
  }
}

export function getSettings() {
  ensureSettings();
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
}

export function saveSettings(updates) {
  ensureSettings();
  const current = getSettings();
  const merged = { ...current, ...updates };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2));
  return merged;
}
