/**
 * Custom Next.js server: /_next/static/* diskdan; document so'rovlariga ?v=BUILD_ID — deploy dan keyin yangi HTML, chunk 404 yo'q.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { parse } = require("url");
const next = require("next");

if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = "production";
const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

/** Har bir build uchun bitta — document cache bust, eski chunk 404 chiqmasin */
let BUILD_ID = "";
try {
  BUILD_ID = fs.readFileSync(path.join(__dirname, ".next", "BUILD_ID"), "utf8").trim();
} catch (_) {
  BUILD_ID = String(Date.now());
}

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
    let subPath = (urlPath || "")
      .replace(/^\/_next\/static\//, "")
      .replace(/\?.*$/, "")
      .trim();
    try {
      subPath = decodeURIComponent(subPath);
    } catch (_) {}
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

/** v= yo'q yoki noto'g'ri bo'lsa — chunk so'ramaydigan loader HTML (cache lanmas, keyin to'g'ri v= ga yo'naltiradi). */
function sendLoaderHtml(res, pathname, query, buildId) {
  const safeId = String(buildId).replace(/[<>"']/g, "");
  const html = [
    "<!DOCTYPE html><html><head>",
    '<meta http-equiv="Cache-Control" content="no-store,no-cache,must-revalidate">',
    '<meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0">',
    "<title>Yuklanmoqda...</title></head><body>",
    "<p>Yuklanmoqda...</p>",
    "<script>",
    "(function(){",
    "var p=location.pathname,h=location.hash||'',s=new URLSearchParams(location.search);",
    "s.set('v','" + safeId + "');",
    "location.replace(p+'?'+s.toString()+h);",
    "})();",
    "</script></body></html>",
  ].join("");
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end(html);
}

app.prepare().then(() => {
  http
    .createServer((req, res) => {
      try {
        const parsedUrl = parse(req.url || "/", true);
        const pathname = parsedUrl.pathname || "/";
        const query = parsedUrl.query || {};

        if (req.method === "GET" && pathname.startsWith("/_next/static/")) {
          serveStatic(req, res, pathname);
          return;
        }

        if (req.method === "GET" && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
          if (query.v !== BUILD_ID) {
            sendLoaderHtml(res, pathname, query, BUILD_ID);
            return;
          }
        }

        handle(req, res, parsedUrl);
      } catch (e) {
        send404(res);
      }
    })
    .listen(port, () => {
      console.log("> Ready on http://localhost:" + port + " (v=" + BUILD_ID + ")");
    });
});
