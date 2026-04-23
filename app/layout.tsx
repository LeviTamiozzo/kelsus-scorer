import type { Metadata, Viewport } from "next";
import { Victor_Mono } from "next/font/google";
import "./globals.css";

const victorMono = Victor_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-victor-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tennis / Padel Scorer",
  description: "Score your tennis or padel match",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={victorMono.variable}>
      <body className="bg-white text-zinc-900 min-h-screen">{children}</body>
    </html>
  );
}
