import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { ThemeProvider } from "@/lib/theme-context";

export const metadata: Metadata = {
  title: "Ahlan House",
  description: "Boshqaruv tizimi",
  generator: "Ahlan.uz",
  icons: { icon: "/icon.svg" },
};

/** Mobil qurilmalarda to'g'ri masshtab va scroll uchun */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

/** Inline script: chunk 404/ChunkLoadError — HTML yuklanganida darhol ishlaydi, React/chunk dan oldin. */
const CHUNK_RELOAD_SCRIPT = `
(function(){
  var key='chunk_reload_at', cooldown=8000;
  function reload(){
    var now=Date.now(), last=parseInt(sessionStorage.getItem(key)||'0',10);
    if(now-last<cooldown) return;
    sessionStorage.setItem(key,String(now));
    var u=location.pathname+(location.search ? location.search+'&' : '?')+'_cb='+now+location.hash;
    location.replace(u);
  }
  function check(msg){
    if(!msg||typeof msg!=='string') return;
    if(/ChunkLoadError|Loading chunk|419|Suspense boundary|_next\\\\/static\\\\//.test(msg)) reload();
    if(/Failed to load resource|404|ERR_ABORTED|chunk.*failed/.test(msg)) reload();
  }
  window.addEventListener('error',function(e){ check(e.message); if(e.filename&&e.filename.indexOf('_next/static')!==-1) reload(); });
  window.addEventListener('unhandledrejection',function(e){ check((e.reason&&e.reason.message)||String(e.reason)); });
})();
`.replace(/<\/script>/gi, "<\\/script>");

/** /_/BUILD_ID ni pathdan olib tashlash — URL bar faqat / yoki /login ko'rinsin, query/regex xato bo'lmasin. */
const STRIP_PATH_PREFIX_SCRIPT = `
(function(){
  var p=location.pathname;
  if(p.indexOf('/_/')===0){
    var rest=p.replace(/^\\/_\\/[^/]+/,'')||'/';
    history.replaceState(null,'',rest+location.search+location.hash);
  }
})();
`.replace(/<\/script>/gi, "<\\/script>");

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <head>
        <script dangerouslySetInnerHTML={{ __html: CHUNK_RELOAD_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: STRIP_PATH_PREFIX_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
