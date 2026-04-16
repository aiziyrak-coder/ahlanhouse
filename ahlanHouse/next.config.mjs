import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    /** lucide: faqat ishlatilgan ikonlar tree-shake — client bundle kichrayadi */
    optimizePackageImports: ["lucide-react"],
  },
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/icon.svg", permanent: false },
      { source: "/sotuv", destination: "/login", permanent: false },
      { source: "/sotuv/:path*", destination: "/login", permanent: false },
    ];
  },
  /** Deploy dan keyin brauzer yangi HTML olishi uchun — eski chunk 500 xatosini bartaraf etadi. */
  async headers() {
    const noCache = [
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      { key: "Pragma", value: "no-cache" },
      { key: "Expires", value: "0" },
    ];
    const appRoutes = [
      "/",
      "/login",
      "/apartments",
      "/apartments/add",
      "/expenses",
      "/payments",
      "/suppliers",
      "/clients",
      "/qarzdorlar",
      "/properties",
      "/properties/add",
      "/reports",
      "/settings",
      "/documents",
    ];
    return [
      ...appRoutes.map((source) => ({ source, headers: noCache })),
      { source: "/apartments/:path*", headers: noCache },
      { source: "/suppliers/:path*", headers: noCache },
      { source: "/clients/:path*", headers: noCache },
      { source: "/properties/:path*", headers: noCache },
    ];
  },
};
export default nextConfig;
