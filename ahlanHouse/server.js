/**
 * Custom Next.js server: /_next/static/* diskdan xizmat qiladi, fayl yo'q yoki xato bo'lsa 404 (500 hech qachon emas).
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

function send404(res) {
  try {
    if (!res.headersSent) {
      res.writeHead(404);
      res.end();
    }
  } catch (_) {}
}

function serveStatic(req, res, urlPath) {
  try {
    const base = path.join(__dirname, ".next", "static");
    const subPath = (urlPath || "")
      .replace(/^\/_next\/static\//, "")
      .replace(/\?.*$/, "")
      .trim();
    if (!subPath || subPath.includes("..")) {
      send404(res);
      return;
    }
    const filePath = path.join(base, subPath);
    const baseResolved = path.resolve(base);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(baseResolved)) {
      send404(res);
      return;
    }
    fs.access(resolved, fs.constants.R_OK, (err) => {
      if (err) {
        send404(res);
        return;
      }
      try {
        const ext = path.extname(resolved);
        const type = MIMES[ext] || "application/octet-stream";
        res.setHeader("Content-Type", type);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        const stream = fs.createReadStream(resolved);
        stream.on("error", () => send404(res));
        res.on("error", () => stream.destroy());
        stream.pipe(res);
      } catch (e) {
        send404(res);
      }
    });
  } catch (e) {
    send404(res);
  }
}

app.prepare().then(() => {
  http
    .createServer((req, res) => {
      try {
        const parsedUrl = parse(req.url || "/", true);
        const pathname = parsedUrl.pathname || "/";
        if (req.method === "GET" && pathname.startsWith("/_next/static/")) {
          serveStatic(req, res, pathname);
          return;
        }
        handle(req, res, parsedUrl);
      } catch (e) {
        send404(res);
      }
    })
    .listen(port, () => {
      console.log("> Ready on http://localhost:" + port);
    });
});
