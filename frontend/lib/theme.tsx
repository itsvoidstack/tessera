"use client";

/**
 * ThemeProvider — single source of truth for dark/light mode.
 *
 * - Reads "tessera_theme" from localStorage on mount.
 * - Default is "dark" if no preference is saved.
 * - Applies/removes the "dark" class on <html>.
 * - Exposes useTheme() hook to every component that needs theme state.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  isDark: true,
  toggle: () => {},
  setTheme: () => {},
});

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer — reads localStorage once synchronously so we never
  // need to call setState inside a useEffect, which the linter flags.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("tessera_theme");
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    // Keep the <html> class in sync on first mount (handles SSR/hydration mismatch).
    applyTheme(theme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    localStorage.setItem("tessera_theme", next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem("tessera_theme", next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
