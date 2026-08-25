import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keel — Co-Parenting Calendar",
  description: "Who has Patrick, right now.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}
