import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Roomie — Find your kind of roommate",
  description:
    "A calm, compatibility-first way for hostel students to find future-year roommates who actually fit their lifestyle.",
  applicationName: "Roomie",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Roomie" },
};

export const viewport: Viewport = {
  themeColor: "#FEFCF6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="bg-canvas text-ink min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
