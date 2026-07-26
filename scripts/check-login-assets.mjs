import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const kib = 1024;
const limits = [
  ['public/school-logo.png', 100 * kib],
  ['public/apple-touch-icon.png', 50 * kib],
  ['public/school-logo-v2.webp', 50 * kib],
];

let total = 0;
for (const [relativePath, maxBytes] of limits) {
  const { size } = await stat(resolve(relativePath));
  total += size;
  if (size > maxBytes) {
    throw new Error(`${relativePath} is ${size} bytes; budget is ${maxBytes} bytes.`);
  }
}

if (total > 150 * kib) {
  throw new Error(`Login logo assets total ${total} bytes; budget is ${150 * kib} bytes.`);
}

process.stdout.write(`Login asset budget passed: ${total} bytes across ${limits.length} logo files.\n`);
