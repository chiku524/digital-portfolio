import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { PROFILE } from "@/content/portfolio";
import { SITE_URL } from "@/lib/site";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Nico Chikuji | Full-Stack Developer",
    template: "%s | nico.builds",
  },
  applicationName: PROFILE.brand,
  keywords: ["Nico Chikuji", "nico.builds", "full-stack developer", "web3", "AI", "Next.js", "React", "portfolio"],
  creator: PROFILE.name,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  description:
    "Full-stack developer building web3, AI, and product systems that perform and scale. Flow beyond limits. Stay Playful, Ship Serious.",
  authors: [{ name: PROFILE.name, url: PROFILE.github }],
  openGraph: {
    title: "Nico Chikuji | Full-Stack Developer",
    description: PROFILE.summary,
    type: "website",
    url: "/",
    siteName: PROFILE.brand,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nico Chikuji | Full-Stack Developer",
    description: PROFILE.summary,
    creator: "@NChikuji",
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
