/**
 * Production HTTP server — Next.js standart `handle` (pathda `/_/BUILD_ID` yo'q).
 * Deploydan keyin HTML no-cache (next.config + nginx) va layoutdagi chunk-reload yetarli.
 */
const http = require("http");
const { parse } = require("url");
const next = require("next");

if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = "production";
const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

/** `/login` emas, `/xYzLongRandom` kabi noto'g'ri qolgan build URL */
const KNOWN_TOP = new Set([
  "login", "apartments", "clients", "documents", "expenses", "payments",
  "properties", "qarzdorlar", "reports", "settings", "suppliers",
  "icon.svg", "favicon.ico", "robots.txt", "sitemap.xml",
]);
function loneStaleBuildPath(method, pathname) {
  if (method !== "GET") return null;
  const m = pathname.match(/^\/([^/]+)$/);
  if (!m) return null;
  const seg = m[1];
  if (KNOWN_TOP.has(seg.toLowerCase())) return null;
  if (seg.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(seg)) return "/";
  return null;
}

app.prepare().then(() => {
  http
    .createServer((req, res) => {
      try {
        const parsedUrl = parse(req.url || "/", true);
        const pathname = parsedUrl.pathname || "/";
        const search = parsedUrl.search || "";
        /* Eski `/_/BUILD_ID/...` havolalari — toza path (308, GET). `/_next` tegmasin. */
        if (
          req.method === "GET" &&
          pathname.startsWith("/_/") &&
          !pathname.startsWith("/_next")
        ) {
          const rest = pathname.replace(/^\/_\/[^/]+/, "") || "/";
          res.writeHead(308, { Location: rest + search });
          res.end();
          return;
        }
        const lone = loneStaleBuildPath(req.method, pathname);
        if (lone) {
          res.writeHead(308, { Location: lone + search });
          res.end();
          return;
        }
        handle(req, res, parsedUrl);
      } catch (_) {
        try {
          if (!res.headersSent) {
            res.writeHead(500);
            res.end("Internal Server Error");
          }
        } catch (__) {}
      }
    })
    .listen(port, () => {
      console.log("> Ready on http://localhost:" + port + " (Next.js)");
    });
});
