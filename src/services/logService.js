import fs from 'fs';
import path from 'path';

const logsDirectory = path.join(process.cwd(), 'logs');
const requestLogPath = path.join(logsDirectory, 'requests.jsonl');
const MAX_LOG_ENTRIES = 5000;

function ensureLogsDirectory() {
  if (!fs.existsSync(logsDirectory)) fs.mkdirSync(logsDirectory, { recursive: true });
}

function appendLog(filePath, entry) {
  try {
    ensureLogsDirectory();
    fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    // Logging must never break a request or hide the original application error.
    console.error('Could not write application log:', error.message);
  }
}

export function recordRequestLog(entry) {
  appendLog(requestLogPath, entry);
}

export function getRequestLogs(limit = 250) {
  if (!fs.existsSync(requestLogPath)) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 250, 1), MAX_LOG_ENTRIES);
  const lines = fs.readFileSync(requestLogPath, 'utf8').split('\n').filter(Boolean);

  return lines
    .slice(-safeLimit)
    .reverse()
    .flatMap(line => {
      try {
        return [JSON.parse(line)];
      } catch (_) {
        return [];
      }
    });
}
