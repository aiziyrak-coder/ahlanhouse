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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
