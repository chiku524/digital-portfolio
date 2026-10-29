import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { PROFILE } from "@/content/portfolio";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://digital-portfolio-nico-builds.vercel.app"),
  title: "Nico Chikuji | Full-Stack Developer",
  description:
    "Full-stack developer building web3, AI, and product systems that perform and scale. Flow beyond limits. Stay Playful, Ship Serious.",
  authors: [{ name: PROFILE.name, url: PROFILE.github }],
  openGraph: {
    title: "Nico Chikuji | Full-Stack Developer",
    description: PROFILE.summary,
    type: "website",
    url: "/",
    siteName: PROFILE.brand,
  },
};

export const viewport: Viewport = {
  themeColor: "#04141c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
