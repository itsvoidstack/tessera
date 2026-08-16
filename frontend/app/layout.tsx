import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppStoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tessera — AI Codebase Auditor",
  description:
    "Tessera analyzes any GitHub repository to visualize architecture, detect issues, and generate learning notes.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.svg",
  },
};

/**
 * Blocking inline script — runs synchronously before any paint.
 * Reads tessera_theme from localStorage and applies the correct class
 * to <html> immediately, preventing any flash of wrong theme.
 * Default: "dark".
 */
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('tessera_theme');
    var isDark = t ? t === 'dark' : true;
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
    if (!isDark) document.documentElement.classList.remove('dark');
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      {/* suppressHydrationWarning on <head> because the inline script
          mutates the DOM before React hydrates */}
      <head suppressHydrationWarning>
        {/* Blocking theme script — must be first child of <head> */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full antialiased transition-colors duration-200">
        <AppStoreProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
