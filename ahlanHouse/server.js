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
  BUILD_ID = "";
}
if (!BUILD_ID) {
  console.warn("[server.js] .next/BUILD_ID topilmadi — document loader o‘chiriladi, oddiy Next ishlaydi.");
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

/** Birinchi script: ver= va /_/xxx ni URL dan olib tashlash — barcha skriptlardan oldin (regex flags xato bo'lmasin). */
const INJECT_STRIP_SCRIPT =
  "<script>(function(){var s=location.search,p=location.pathname;" +
  "if(s&&s.indexOf('ver=')!==-1){var q=new URLSearchParams(s);q.delete('ver');var t=q.toString();history.replaceState(null,'',p+(t?'?'+t:'')+location.hash);}" +
  "if(p.indexOf('/_/')===0){var r=p.replace(/^\\/_\\/[^/]+/,'')||'/';history.replaceState(null,'',r+location.search+location.hash);}" +
  "})();</script>";

/** Eski /_/noto'g'riBuild/... yo'lini haqiqiy app pathiga aylantiradi (ikki marta /_/ qo'shilmasin). */
function normalizeDocumentPath(pathname) {
  const p = pathname || "/";
  const m = p.match(/^\/_\/[^/]+(\/.*)?$/);
  if (m) return m[1] && m[1].length ? m[1] : "/";
  return p;
}

/** Build ID yo'l orqali (query emas) — URL da ?ver= bo'lmasin. */
function sendLoaderHtml(res, pathname, query, buildId) {
  const safeId = String(buildId).replace(/[<>"'\s/]/g, "");
  if (!safeId) {
    res.writeHead(302, { Location: normalizeDocumentPath(pathname) || "/" });
    res.end();
    return;
  }
  const appPath = normalizeDocumentPath(pathname);
  const suffix = appPath === "/" ? "" : appPath;
  const targetPath = "/_/" + safeId + suffix;
  const html = [
    "<!DOCTYPE html><html><head>",
    '<meta http-equiv="Cache-Control" content="no-store,no-cache,must-revalidate">',
    '<meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0">',
    "<title>Yuklanmoqda...</title></head><body>",
    "<p>Yuklanmoqda...</p>",
    "<script>",
    "location.replace('" + targetPath.replace(/'/g, "\\'") + "'+(location.hash||''));",
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

/** HTML javobga birinchi scriptni <head> dan keyin qo'shadi — ver= va /_/ strip barcha skriptlardan oldin. */
function bufferAndInjectStripScript(req, res, parsedUrl) {
  const chunks = [];
  const origWrite = res.write.bind(res);
  const origEnd = res.end.bind(res);
  res.write = function (chunk, encoding, cb) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding || "utf8"));
    if (typeof encoding === "function") cb = encoding;
    if (cb) process.nextTick(cb);
    return true;
  };
  res.end = function (chunk, encoding, cb) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding || "utf8"));
    let body = Buffer.concat(chunks).toString("utf8");
    if (body.indexOf("<!DOCTYPE html") !== -1) {
      body = body.replace(/<!DOCTYPE html\s*>/i, "$&" + INJECT_STRIP_SCRIPT);
    }
    res.removeHeader("Transfer-Encoding");
    res.setHeader("Content-Length", String(Buffer.byteLength(body, "utf8")));
    res.write = origWrite;
    res.end = origEnd;
    origWrite(body, "utf8");
    origEnd(cb);
  };
  handle(req, res, parsedUrl);
}

/** ver= query barcha document so'rovlarida redirect orqali olib tashlanadi — brauzer hech qachon ver= ko'rmaydi, RegExp flags xato bo'lmasin. */
function redirectStripVer(res, pathname, query, hash) {
  const q = { ...query };
  delete q.ver;
  const qs = Object.keys(q).length ? "?" + new URLSearchParams(q).toString() : "";
  const loc = pathname + qs + (hash || "");
  res.writeHead(302, { Location: loc });
  res.end();
}

app.prepare().then(() => {
  http
    .createServer((req, res) => {
      try {
        const parsedUrl = parse(req.url || "/", true);
        const pathname = parsedUrl.pathname || "/";
        const query = parsedUrl.query || {};
        const hasVer = query && Object.prototype.hasOwnProperty.call(query, "ver");

        if (req.method === "GET" && pathname.startsWith("/_next/static/")) {
          serveStatic(req, res, pathname);
          return;
        }

        if (req.method === "GET" && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
          if (hasVer) {
            redirectStripVer(res, pathname, query, parsedUrl.hash || "");
            return;
          }
          if (!BUILD_ID) {
            handle(req, res, parsedUrl);
            return;
          }
          const pathBuildMatch = pathname.match(/^\/_\/([^/]+)(\/.*)?$/);
          if (pathBuildMatch) {
            const pathBuildId = pathBuildMatch[1];
            const restPath = pathBuildMatch[2] || "/";
            if (pathBuildId === BUILD_ID) {
              const rewrite = { ...parsedUrl, pathname: restPath === "/" ? "/" : restPath, path: restPath };
              bufferAndInjectStripScript(req, res, rewrite);
              return;
            }
            /* Eski build ID — cheksiz loader o'rniga yangi build URL ga bir marta yo'naltirish */
            sendLoaderHtml(res, normalizeDocumentPath(pathname), query, BUILD_ID);
            return;
          }
          if (BUILD_ID) {
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
      console.log("> Ready on http://localhost:" + port + " (ver=" + BUILD_ID + ")");
    });
});
