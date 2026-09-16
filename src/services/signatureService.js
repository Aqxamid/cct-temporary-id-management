import fs from 'fs';
import path from 'path';

export function saveSignatureDataUrl(dataUrl, outputPath) {
  const match = String(dataUrl || '').match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) throw new Error('Signature must be a transparent PNG data URL.');

  const buffer = Buffer.from(match[1], 'base64');
  if (!buffer.length) throw new Error('Signature image is empty.');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
}
