import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/icon.svg", permanent: false },
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
      "/sotuv",
      "/sotuv/login",
      "/sotuv/mijozlar",
      "/sotuv/obyektlar",
      "/sotuv/shartnomalar",
      "/sotuv/uylar",
      "/sotuv/virtual-tur",
    ];
    return [
      ...appRoutes.map((source) => ({ source, headers: noCache })),
      { source: "/apartments/:path*", headers: noCache },
      { source: "/suppliers/:path*", headers: noCache },
      { source: "/clients/:path*", headers: noCache },
      { source: "/properties/:path*", headers: noCache },
      { source: "/sotuv/:path*", headers: noCache },
    ];
  },
};
export default nextConfig;
