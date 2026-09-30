// Tiny static server so ui-score can read cross-origin-free stylesheets (file:// blocks sheet.cssRules).
import http from 'node:http'
import fs from 'node:fs'
import { extname, join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = dirname(fileURLToPath(import.meta.url))
const T = { '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.js': 'text/javascript', '.png': 'image/png' }
http.createServer((q, r) => {
  const p = resolve(join(root, decodeURIComponent(q.url.split('?')[0])))
  const f = fs.existsSync(p) && fs.statSync(p).isDirectory() ? join(p, 'index.html') : p
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': T[extname(f)] ?? 'application/octet-stream' }); fs.createReadStream(f).pipe(r)
}).listen(Number(process.argv[2] ?? 8765))
