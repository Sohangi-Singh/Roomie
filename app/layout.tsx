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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FEFCF6" },
    { media: "(prefers-color-scheme: dark)", color: "#0A100A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

/** Runs before React hydrates — sets data-theme="dark" if the user picked
 *  it last visit, so there's no flash of the wrong theme on load. */
const THEME_INIT = `try{var t=localStorage.getItem('roomie-theme');if(t==='dark'){document.documentElement.dataset.theme='dark';}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="bg-canvas text-ink min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
