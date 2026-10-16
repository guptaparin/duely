import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Fonts are self-hosted (no runtime call to Google Fonts).
const serif = localFont({
  variable: "--font-instrument-serif",
  src: [
    { path: "./fonts/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "Duely — get paid on time, without the awkward emails",
  description:
    "Duely is an AI invoice chaser for freelancers and agencies. Send invoices with a UPI/card payment link and let AI write and send the follow-ups.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
