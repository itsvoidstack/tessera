import type { Metadata } from "next";
import "./globals.css";
import { AppStoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Tessera — AI Codebase Auditor",
  description:
    "Tessera analyzes any GitHub repository to visualize architecture, detect issues, and generate learning notes.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.svg",
  },
};

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full"
    >
      <head suppressHydrationWarning>
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