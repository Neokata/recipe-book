import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { PwaShell } from "@/components/PwaShell";

export const metadata: Metadata = {
  title: "The Recipe Book",
  description: "A curated collection of baking recipes — at your fingertips.",
  applicationName: "The Recipe Book",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "The Recipe Book",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FBF7F2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">{children}</main>
        <PwaShell />
      </body>
    </html>
  );
}
