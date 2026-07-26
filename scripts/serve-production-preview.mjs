import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { createGzip } from 'node:zlib';

const root = resolve(process.cwd(), 'dist');
const port = Number.parseInt(process.env.PREVIEW_PORT || '3001', 10);
const compressibleExtensions = new Set(['.css', '.html', '.js', '.json', '.svg', '.webmanifest']);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
};

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  if (pathname === '/_vercel/insights/script.js') {
    response.writeHead(204, { 'Content-Type': 'text/javascript; charset=utf-8' });
    response.end();
    return;
  }

  const requestedPath = resolve(root, `.${pathname}`);
  const safePath = requestedPath === root || requestedPath.startsWith(`${root}${sep}`)
    ? requestedPath
    : resolve(root, 'index.html');
  const filePath = existsSync(safePath) && statSync(safePath).isFile()
    ? safePath
    : resolve(root, 'index.html');
  const extension = extname(filePath).toLowerCase();
  const acceptsGzip = /\bgzip\b/.test(request.headers['accept-encoding'] || '');

  response.setHeader('Content-Type', contentTypes[extension] || 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Accept-Encoding');

  if (acceptsGzip && compressibleExtensions.has(extension)) {
    response.setHeader('Content-Encoding', 'gzip');
    createReadStream(filePath).pipe(createGzip({ level: 9 })).pipe(response);
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Production preview listening on http://127.0.0.1:${port}\n`);
});
