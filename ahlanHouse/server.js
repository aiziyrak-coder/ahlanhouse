/**
 * Custom Next.js server: /_next/static/* diskdan xizmat qiladi, fayl yo'q bo'lsa 404 (500 emas).
 * ChunkLoadError va deploy keyin eski chunk so'rovlari 404 qaytadi, brauzer yangilash ishlaydi.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { parse } = require("url");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const MIMES = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".map": "application/json",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

function serveStatic(req, res, urlPath) {
  const base = path.join(__dirname, ".next", "static");
  const subPath = urlPath.replace(/^\/_next\/static\//, "").replace(/\?.*$/, "");
  if (!subPath || subPath.includes("..")) {
    res.writeHead(404);
    res.end();
    return;
  }
  const filePath = path.join(base, subPath);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(base))) {
    res.writeHead(404);
    res.end();
    return;
  }
  fs.access(resolved, fs.constants.R_OK, (err) => {
    if (err) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = path.extname(resolved);
    const type = MIMES[ext] || "application/octet-stream";
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    fs.createReadStream(resolved).pipe(res);
  });
}

app.prepare().then(() => {
  http
    .createServer((req, res) => {
      const parsedUrl = parse(req.url || "/", true);
      const pathname = parsedUrl.pathname || "/";
      if (req.method === "GET" && pathname.startsWith("/_next/static/")) {
        serveStatic(req, res, pathname);
        return;
      }
      handle(req, res, parsedUrl);
    })
    .listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    });
});
