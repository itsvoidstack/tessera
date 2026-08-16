"use client";

import Link from "next/link";
import Logo from "./Logo";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

export default function PublicNavbar() {
  const { isDark, toggle } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600 dark:text-gray-300">
          {["Features", "How it works", "Pricing", "FAQ"].map((label) => (
            <Link
              key={label}
              href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
              className="hover:text-gray-900 dark:hover:text-white transition-colors duration-150"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 cursor-pointer"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark
              ? <Sun  size={17} className="text-amber-400" />
              : <Moon size={17} className="text-indigo-500" />
            }
          </button>

          <Link
            href="/login"
            className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-1.5 font-medium"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-[#1a5c38] hover:bg-[#145230] dark:bg-green-700 dark:hover:bg-green-600 text-white px-4 py-1.5 rounded-md transition-colors font-medium cursor-pointer"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
