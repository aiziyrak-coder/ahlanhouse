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
/** Faqat haqiqiy chunk/deploy nosozligi — umumiy 404/API xatolari sahifani qayta yuklamasin. */
const CHUNK_RELOAD_SCRIPT = `
(function(){
  var key='chunk_reload_at', cooldown=12000;
  function reload(){
    var now=Date.now(), last=parseInt(sessionStorage.getItem(key)||'0',10);
    if(now-last<cooldown) return;
    sessionStorage.setItem(key,String(now));
    var u=location.pathname+(location.search ? location.search+'&' : '?')+'_cb='+now+location.hash;
    location.replace(u);
  }
  function isChunkFailure(msg){
    if(!msg||typeof msg!=='string') return false;
    if(/ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed|Cannot find module.*chunk/i.test(msg)) return true;
    if(msg.indexOf('_next/static')!==-1 && /(chunk|load|import|script|css)/i.test(msg)) return true;
    return false;
  }
  window.addEventListener('error',function(e){
    var fn=e&&e.filename||'';
    if(fn.indexOf('_next/static')!==-1) reload();
    else if(isChunkFailure(e&&e.message||'')) reload();
  });
  window.addEventListener('unhandledrejection',function(e){
    var m=(e.reason&&e.reason.message)||String(e.reason||'');
    if(isChunkFailure(m)) reload();
  });
})();
`.replace(/<\/script>/gi, "<\\/script>");

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <head>
        <script dangerouslySetInnerHTML={{ __html: CHUNK_RELOAD_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
