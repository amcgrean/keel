import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "./register-sw";
import { BottomNav } from "./bottom-nav";

export const metadata: Metadata = {
  title: "Keel — Co-Parenting Calendar",
  description: "Who has Patrick, right now.",
  applicationName: "Keel",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Keel", statusBarStyle: "default" },
  icons: { icon: "/favicon-32.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#22282B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body">
        {children}
        <BottomNav />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
